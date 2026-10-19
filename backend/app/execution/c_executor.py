import shutil
import tempfile
import os
import subprocess
import time
from typing import Optional, List
from app.execution.base_executor import BaseExecutor, ExecutionResult
from app.core.config import settings

class CExecutor(BaseExecutor):
    """
    Executor for C code.
    Attempts local GCC compilation if installed; otherwise utilizes isolated GCC 14 container sandbox.
    """

    def execute(
        self,
        code: str,
        stdin: str = "",
        timeout: int = settings.EXECUTION_TIMEOUT_SECONDS,
        files: Optional[list] = None,
        entry_file: Optional[str] = None
    ) -> ExecutionResult:
        if not code.strip() and not files:
            return ExecutionResult(
                status="Accepted",
                output="",
                error="",
                stdout="",
                stderr="",
                execution_time=0.0,
                memory_used=0.0,
                exit_code=0
            )

        norm_stdin = (stdin or "").replace("\r\n", "\n").replace("\r", "\n")
        if norm_stdin and not norm_stdin.endswith("\n"):
            norm_stdin += "\n"

        # Check if local gcc or clang is available and functional
        from app.execution.compiler_registry import get_gcc_toolchain
        gcc_bin = get_gcc_toolchain(cpp=False)
        if gcc_bin:
            return self._execute_local_c(gcc_bin, code, norm_stdin, timeout, files, entry_file)

        # Otherwise execute in secure isolated container sandbox (Wandbox GCC)
        return self._execute_container_sandbox(
            compiler="gcc-13.2.0-c",
            code=code,
            stdin=norm_stdin,
            timeout=timeout,
            compiler_options="-O2\n-Wall"
        )

    def _execute_local_c(
        self,
        gcc_bin: str,
        code: str,
        stdin: str,
        timeout: int,
        files: Optional[list] = None,
        entry_file: Optional[str] = None
    ) -> ExecutionResult:
        temp_dir = tempfile.mkdtemp(prefix="codeforge_c_")
        try:
            self._materialize_files(temp_dir, files, entry_file or "main.c", code)
            out_bin = os.path.join(temp_dir, "main.exe" if os.name == "nt" else "main")

            src_files = [os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.endswith(".c")]
            if not src_files:
                src_files = [os.path.join(temp_dir, "main.c")]

            # 1. Compile with C11 standard and link standard math library
            compile_start = time.time()
            compile_cmd = [gcc_bin, "-O2", "-Wall", "-std=c11", "-I", temp_dir] + src_files
            if os.name != "nt":
                compile_cmd.append("-lm")
            compile_cmd.extend(["-o", out_bin])

            compile_proc = subprocess.run(
                compile_cmd,
                capture_output=True,
                text=True,
                cwd=temp_dir,
                timeout=10
            )

            if compile_proc.returncode != 0:
                return ExecutionResult(
                    status="Compilation Error",
                    output="",
                    error=compile_proc.stderr,
                    stdout="",
                    stderr=compile_proc.stderr,
                    execution_time=time.time() - compile_start,
                    memory_used=None,
                    exit_code=compile_proc.returncode
                )

            # 2. Run compiled binary
            res = self._execute_local_process(
                command=[out_bin],
                cwd=temp_dir,
                stdin=stdin,
                timeout=timeout,
                estimated_mem=4.2,
                source_code=code
            )
            return res

        except subprocess.TimeoutExpired:
            return ExecutionResult(
                status="Time Limit Exceeded",
                output="",
                error="Compilation timed out.",
                stdout="",
                stderr="Compilation timed out.",
                execution_time=10.0,
                memory_used=None,
                exit_code=124
            )
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
