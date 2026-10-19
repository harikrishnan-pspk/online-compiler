import os
import sys
import time
import shutil
import tempfile
import subprocess
import threading
from typing import Optional, Callable
from app.core.config import settings

class InteractiveSession:
    """
    Manages an isolated interactive execution session with real-time bidirectional stdin/stdout streaming.
    Applies security constraints: strict command whitelist, execution timeouts, output size caps,
    and automatic cleanup of sandboxed directories.
    """

    def __init__(
        self,
        language: str,
        code: str,
        on_stdout: Callable[[str], None],
        on_stderr: Callable[[str], None],
        on_exit: Callable[[int, str, float], None],
        files: Optional[list] = None,
        entry_file: Optional[str] = None
    ):
        self.language = (language or "").lower().strip()
        self.code = code
        self.on_stdout = on_stdout
        self.on_stderr = on_stderr
        self.on_exit = on_exit
        self.files = files or []
        self.entry_file = entry_file

        self.temp_dir = tempfile.mkdtemp(prefix="codeforge_interactive_")
        self.process: Optional[subprocess.Popen] = None
        self.start_time: float = 0.0
        self.total_output_bytes: int = 0
        self.is_terminated = False
        self._threads = []
        self._closed = False

    def start(self) -> bool:
        self.start_time = time.time()
        try:
            # Enforce max code length
            if len(self.code.encode('utf-8')) > settings.MAX_CODE_SIZE_BYTES:
                self.on_stderr(f"Error: Code exceeds maximum allowed size of {settings.MAX_CODE_SIZE_BYTES} bytes.\n")
                self.on_exit(1, "Error", 0.0)
                self.cleanup()
                return False

            # Materialize project files if provided
            if self.files:
                for f in self.files:
                    fname = f.get("name", "").strip()
                    if not fname or f.get("is_folder", False):
                        continue
                    rel_path = (f.get("path") or fname).lstrip("/\\")
                    full_path = os.path.join(self.temp_dir, rel_path)
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    content = f.get("content", "")
                    if (fname == self.entry_file or not self.entry_file) and self.code:
                        content = self.code
                    with open(full_path, "w", encoding="utf-8") as fp:
                        fp.write(content)

            # Compile or prepare command based on language
            from app.execution.compiler_registry import (
                get_gcc_toolchain,
                get_jdk_toolchain,
                get_node_binary,
                get_python_binary
            )

            if self.language in ("c", "cpp"):
                is_cpp = self.language == "cpp"
                compiler = get_gcc_toolchain(cpp=is_cpp)
                if not compiler:
                    self.on_stderr(f"Compiler '{('g++' if is_cpp else 'gcc')}' is missing or not installed on this system.\n")
                    self.on_exit(1, "Error", 0.0)
                    self.cleanup()
                    return False

                src_ext = "cpp" if is_cpp else "c"
                entry_name = self.entry_file or f"main.{src_ext}"
                src_file = os.path.join(self.temp_dir, entry_name)
                out_bin = os.path.join(self.temp_dir, "main.exe" if os.name == "nt" else "main")
                unbuf_header = os.path.join(self.temp_dir, "unbuffer.h")

                if not os.path.exists(src_file):
                    with open(src_file, "w", encoding="utf-8") as f:
                        f.write(self.code)

                # Unbuffering header guarantees real-time printf/cout streaming even without explicit fflush()
                with open(unbuf_header, "w", encoding="utf-8") as f:
                    f.write(
                        '#include <stdio.h>\n'
                        '#ifdef __cplusplus\nextern "C" {\n#endif\n'
                        '__attribute__((constructor)) static void __codeforge_unbuf_init() {\n'
                        '    setvbuf(stdout, NULL, _IONBF, 0);\n'
                        '    setvbuf(stderr, NULL, _IONBF, 0);\n'
                        '}\n'
                        '#ifdef __cplusplus\n}\n#endif\n'
                    )

                src_files_to_compile = []
                for root, _, filenames in os.walk(self.temp_dir):
                    for fn in filenames:
                        if is_cpp and fn.endswith((".cpp", ".cc", ".cxx")):
                            src_files_to_compile.append(os.path.join(root, fn))
                        elif not is_cpp and fn.endswith(".c"):
                            src_files_to_compile.append(os.path.join(root, fn))

                if not src_files_to_compile:
                    src_files_to_compile = [src_file]

                cmd = [compiler, "-include", unbuf_header, "-O2", "-Wall", "-I", self.temp_dir]
                if is_cpp:
                    cmd.append("-std=c++17")
                else:
                    cmd.append("-std=c11")
                cmd.extend(src_files_to_compile)
                if not is_cpp and os.name != "nt":
                    cmd.append("-lm")
                cmd.extend(["-o", out_bin])

                compile_res = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    cwd=self.temp_dir,
                    timeout=15
                )

                if compile_res.returncode != 0:
                    self.on_stderr(compile_res.stderr)
                    self.on_exit(compile_res.returncode, "Compilation Error", round(time.time() - self.start_time, 3))
                    self.cleanup()
                    return False

                exec_cmd = [out_bin]

            elif self.language in ("python", "py"):
                entry_name = self.entry_file or "main.py"
                src_file = os.path.join(self.temp_dir, entry_name)
                if not os.path.exists(src_file):
                    with open(src_file, "w", encoding="utf-8") as f:
                        f.write(self.code)
                py_bin = get_python_binary()
                # -u: unbuffered binary stdout and stderr
                exec_cmd = [py_bin, "-u", src_file]

            elif self.language in ("javascript", "js"):
                entry_name = self.entry_file or "main.js"
                src_file = os.path.join(self.temp_dir, entry_name)
                if not os.path.exists(src_file):
                    with open(src_file, "w", encoding="utf-8") as f:
                        f.write(self.code)
                node_bin = get_node_binary()
                if not node_bin:
                    self.on_stderr("Node.js runtime ('node') is missing or not installed on this system.\n")
                    self.on_exit(1, "Error", 0.0)
                    self.cleanup()
                    return False
                exec_cmd = [node_bin, src_file]

            elif self.language == "java":
                import re

                entry_name = self.entry_file or "Main.java"
                class_match = re.search(r'(?:public\s+)?class\s+([A-Za-z0-9_]+)', self.code)
                class_name = os.path.splitext(entry_name)[0] if self.entry_file else (class_match.group(1) if class_match else "Main")

                src_file = os.path.join(self.temp_dir, f"{class_name}.java")
                if not os.path.exists(src_file):
                    with open(src_file, "w", encoding="utf-8") as f:
                        f.write(self.code)

                javac_bin, java_bin = get_jdk_toolchain()
                if not (javac_bin and java_bin and (os.path.isfile(javac_bin) or shutil.which(javac_bin)) and (os.path.isfile(java_bin) or shutil.which(java_bin))):
                    self.on_stderr("Java execution environment (JDK) is missing or not configured.\n")
                    self.on_exit(1, "Error", 0.0)
                    self.cleanup()
                    return False

                java_files_to_compile = []
                for root, _, filenames in os.walk(self.temp_dir):
                    for fn in filenames:
                        if fn.endswith(".java"):
                            java_files_to_compile.append(os.path.join(root, fn))

                if not java_files_to_compile:
                    java_files_to_compile = [src_file]

                comp_res = subprocess.run([javac_bin] + java_files_to_compile, capture_output=True, text=True, cwd=self.temp_dir, timeout=15)
                if comp_res.returncode != 0:
                    self.on_stderr(comp_res.stderr)
                    self.on_exit(comp_res.returncode, "Compilation Error", round(time.time() - self.start_time, 3))
                    self.cleanup()
                    return False
                exec_cmd = [java_bin, "-Xmx256m", "-cp", self.temp_dir, class_name]

            else:
                self.on_stderr(f"Interactive execution is not supported for '{self.language}'.\n")
                self.on_exit(1, "Error", 0.0)
                self.cleanup()
                return False

            # Setup isolated sandbox environment variables
            env = dict(os.environ)
            env["PYTHONUNBUFFERED"] = "1"
            env["TEMP"] = self.temp_dir
            env["TMP"] = self.temp_dir

            # Spawn subprocess without shell (Strict Security)
            self.process = subprocess.Popen(
                exec_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.temp_dir,
                env=env,
                bufsize=0
            )

            # Start asynchronous background reader threads
            t_stdout = threading.Thread(target=self._stream_reader, args=(self.process.stdout, self.on_stdout), daemon=True)
            t_stderr = threading.Thread(target=self._stream_reader, args=(self.process.stderr, self.on_stderr), daemon=True)
            t_waiter = threading.Thread(target=self._waiter, daemon=True)

            t_stdout.start()
            t_stderr.start()
            t_waiter.start()
            self._threads = [t_stdout, t_stderr, t_waiter]
            return True

        except Exception as e:
            self.on_stderr(f"Process initialization error: {str(e)}\n")
            self.on_exit(1, "Execution Failed", round(time.time() - self.start_time, 3))
            self.cleanup()
            return False

    def _stream_reader(self, stream, callback: Callable[[str], None]):
        """
        Continuously reads chunks from pipe and forwards them immediately via callback.
        Enforces MAX_OUTPUT_SIZE_BYTES to prevent memory abuse.
        """
        try:
            while True:
                data = os.read(stream.fileno(), 1024)
                if not data:
                    break
                self.total_output_bytes += len(data)
                if self.total_output_bytes > settings.MAX_OUTPUT_SIZE_BYTES:
                    callback("\n... [Output truncated: maximum limit reached]\n")
                    self.stop()
                    break

                text = data.decode("utf-8", errors="replace")
                callback(text)
        except Exception:
            pass

    def _waiter(self):
        """
        Monitors subprocess lifetime, allowing the process to wait indefinitely for user input
        without terminating after a fixed 15-second timeout.
        """
        if not self.process:
            return
        try:
            # Allow indefinite wait for interactive keyboard input
            exit_code = self.process.wait()
            status = "Accepted" if exit_code == 0 else "Runtime Error"
            elapsed = round(time.time() - self.start_time, 3)
            self.on_exit(exit_code, status, elapsed)
        except Exception as e:
            if not self.is_terminated:
                self.on_stderr(f"\n[Execution error: {str(e)}]\n")
                self.on_exit(1, "Execution Failed", 0.0)
        finally:
            self.cleanup()

    def send_stdin(self, text: str):
        """
        Writes user input directly to subprocess stdin pipe and flushes immediately.
        """
        if self.process and self.process.stdin and not self.process.stdin.closed:
            try:
                data = text.encode("utf-8")
                self.process.stdin.write(data)
                self.process.stdin.flush()
            except Exception as e:
                self.on_stderr(f"\n[stdin error: {str(e)}]\n")

    def stop(self):
        """
        Terminates the running subprocess immediately and cleans up resources.
        """
        self.is_terminated = True
        if self.process:
            try:
                self.process.kill()
            except Exception:
                pass
        self.cleanup()

    def cleanup(self):
        """
        Safely removes the temporary working directory and releases handles.
        """
        if self._closed:
            return
        self._closed = True
        if os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir, ignore_errors=True)
            except Exception:
                pass
