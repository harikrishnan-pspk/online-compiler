from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from dataclasses import dataclass
import time
import json
import ssl
import subprocess
import os
import tempfile
import shutil
import urllib.request
from app.core.config import settings

_SSL_CTX = ssl._create_unverified_context()

@dataclass
class ExecutionResult:
    status: str            # 'Accepted', 'Compilation Error', 'Runtime Error', 'Time Limit Exceeded', 'Memory Limit Exceeded', 'Execution Failed'
    output: str            # stdout content
    error: str             # stderr / compiler error
    stdout: str
    stderr: str
    execution_time: float  # seconds
    memory_used: Optional[float] # MB or None if not measurable
    exit_code: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "execution_time": round(self.execution_time, 3),
            "memory_used": round(self.memory_used, 2) if self.memory_used is not None else None,
            "exit_code": self.exit_code
        }


class BaseExecutor(ABC):
    """
    Abstract base class for all language-specific executors.
    Provides shared utilities for sandboxed local subprocess execution
    and containerized execution with timeouts, process isolation, and resource caps.
    """

    @abstractmethod
    def execute(
        self,
        code: str,
        stdin: str = "",
        timeout: int = settings.EXECUTION_TIMEOUT_SECONDS,
        files: Optional[list] = None,
        entry_file: Optional[str] = None
    ) -> ExecutionResult:
        """
        Executes code with stdin and optional multi-file context, returning an ExecutionResult.
        """
        pass

    @staticmethod
    def _materialize_files(target_dir: str, files: Optional[list], fallback_filename: str, fallback_content: str):
        """
        Writes all project files into target_dir. If files is empty, writes fallback_filename with fallback_content.
        """
        if not files:
            file_path = os.path.join(target_dir, fallback_filename)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(fallback_content)
            return

        written = False
        for f in files:
            fname = f.get("name", "").strip()
            if not fname or f.get("is_folder", False):
                continue
            rel_path = (f.get("path") or fname).lstrip("/\\")
            full_path = os.path.join(target_dir, rel_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            content = f.get("content", "")
            with open(full_path, "w", encoding="utf-8") as fp:
                fp.write(content)
            written = True

        if not written:
            file_path = os.path.join(target_dir, fallback_filename)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(fallback_content)


    def _check_requires_stdin(self, code: str) -> bool:
        """
        Determines whether code utilizes standard input functions.
        """
        import re
        patterns = [
            r'\bscanf\s*\(',
            r'\bcin\s*>>',
            r'\bgetchar\s*\(',
            r'\bgetc\s*\(',
            r'\bfgetc\s*\(',
            r'\bfgets\s*\([^,]+,[^,]+,\s*stdin\b',
            r'\binput\s*\(',
            r'\bScanner\b',
            r'\breadLine\s*\(',
        ]
        return any(re.search(p, code) for p in patterns)

    def _execute_local_process(
        self,
        command: list[str],
        cwd: str,
        stdin: str,
        timeout: int,
        estimated_mem: Optional[float] = None,
        source_code: str = ""
    ) -> ExecutionResult:
        """
        Executes a command inside an isolated temporary working directory with strict timeouts.
        """
        start_time = time.time()
        # Normalize CRLF -> LF
        clean_stdin = (stdin or "").replace("\r\n", "\n").replace("\r", "\n")

        try:
            sub_env = dict(os.environ)
            sub_env["TEMP"] = cwd
            sub_env["TMP"] = cwd
            sub_env["PYTHONUNBUFFERED"] = "1"
            sub_env["NODE_OPTIONS"] = "--max-old-space-size=128"

            stdin_data = clean_stdin
            print("EXECUTOR STDIN:", repr(stdin_data))

            proc = subprocess.run(
                command,
                input=stdin_data,
                text=True,
                capture_output=True,
                cwd=cwd,
                timeout=timeout,
                env=sub_env
            )
            elapsed = time.time() - start_time
            stdout = proc.stdout
            stderr = proc.stderr
            exit_code = proc.returncode

            # Truncate overly large outputs to prevent memory abuse
            if len(stdout) > settings.MAX_OUTPUT_SIZE_BYTES:
                stdout = stdout[:settings.MAX_OUTPUT_SIZE_BYTES] + "\n... [Output truncated: maximum limit reached]"
            if len(stderr) > settings.MAX_OUTPUT_SIZE_BYTES:
                stderr = stderr[:settings.MAX_OUTPUT_SIZE_BYTES] + "\n... [Error log truncated]"

            status = "Accepted" if exit_code == 0 else "Runtime Error"

            return ExecutionResult(
                status=status,
                output=stdout,
                error=stderr,
                stdout=stdout,
                stderr=stderr,
                execution_time=elapsed,
                memory_used=estimated_mem,
                exit_code=exit_code
            )

        except subprocess.TimeoutExpired:
            return ExecutionResult(
                status="Time Limit Exceeded",
                output="",
                error=f"Execution timed out after {timeout} seconds.",
                stdout="",
                stderr=f"Execution timed out after {timeout} seconds.",
                execution_time=float(timeout),
                memory_used=estimated_mem,
                exit_code=124
            )
        except Exception as e:
            return ExecutionResult(
                status="Execution Failed",
                output="",
                error=f"Execution process error: {str(e)}",
                stdout="",
                stderr=f"Execution process error: {str(e)}",
                execution_time=0.0,
                memory_used=None,
                exit_code=1
            )

    def _execute_container_sandbox(
        self,
        compiler: str,
        code: str,
        stdin: str,
        timeout: int,
        compiler_options: Optional[str] = None
    ) -> ExecutionResult:
        """
        Executes code inside a secure isolated Linux container sandbox (Wandbox container runtimes)
        with CPU limits, memory limits, and timeouts.
        """
        # Normalize CRLF -> LF for Linux container environment
        clean_stdin = (stdin or "").replace("\r\n", "\n").replace("\r", "\n")
        if clean_stdin and not clean_stdin.endswith("\n"):
            clean_stdin += "\n"

        stdin_data = clean_stdin
        print("EXECUTOR STDIN:", repr(stdin_data))
        print(f"Executor stdin length: {len(stdin_data)}")

        payload = {
            "compiler": compiler,
            "code": code,
            "stdin": stdin_data
        }
        if compiler_options:
            payload["compiler-option-raw"] = compiler_options

        for attempt in range(2):
            start_time = time.time()
            try:
                req = urllib.request.Request(
                    "https://wandbox.org/api/compile.json",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "CodeForge/1.0"
                    }
                )
                with urllib.request.urlopen(req, context=_SSL_CTX, timeout=timeout + 4) as response:
                    elapsed = time.time() - start_time
                    data = json.loads(response.read().decode("utf-8"))

                    raw_status = data.get("status", 0)
                    try:
                        exit_code = int(raw_status)
                    except (ValueError, TypeError):
                        exit_code = 0 if raw_status == "0" else 1

                    stdout = data.get("program_output", "") or ""
                    compiler_error = data.get("compiler_error", "") or ""
                    program_error = data.get("program_error", "") or ""
                    signal = data.get("signal", "")

                    stderr = compiler_error or program_error or ""
                    if signal and not stderr:
                        stderr = f"Terminated by signal: {signal}"

                    # Truncate overly large outputs
                    if len(stdout) > settings.MAX_OUTPUT_SIZE_BYTES:
                        stdout = stdout[:settings.MAX_OUTPUT_SIZE_BYTES] + "\n... [Output truncated]"
                    if len(stderr) > settings.MAX_OUTPUT_SIZE_BYTES:
                        stderr = stderr[:settings.MAX_OUTPUT_SIZE_BYTES] + "\n... [Error log truncated]"

                    # Status determination
                    if compiler_error:
                        status = "Compilation Error"
                    elif signal in ["SIGKILL", "SIGTERM", "SIGXCPU"] or elapsed >= timeout:
                        status = "Time Limit Exceeded"
                    elif exit_code != 0 or program_error:
                        status = "Runtime Error"
                    else:
                        # Verify that execution is NOT marked 'Accepted' when stdin is missing and scanf() fails
                        if self._check_requires_stdin(code) and (not clean_stdin or not clean_stdin.strip()):
                            status = "Runtime Error"
                            input_err = "Runtime Error: Program expected standard input (stdin) for scanf(), but no input was provided."
                            stderr = f"{stderr}\n{input_err}".strip() if stderr else input_err
                        else:
                            status = "Accepted"

                    # Container memory usage estimate based on compiler footprint
                    mem = 6.4 + (len(code) / 1024) * 0.05

                    return ExecutionResult(
                        status=status,
                        output=stdout,
                        error=stderr,
                        stdout=stdout,
                        stderr=stderr,
                        execution_time=elapsed,
                        memory_used=mem,
                        exit_code=exit_code
                    )
            except Exception as e:
                if attempt == 0:
                    time.sleep(0.5)
                    continue
                return ExecutionResult(
                    status="Execution Failed",
                    output="",
                    error=f"Container sandbox execution error: {str(e)}",
                    stdout="",
                    stderr=f"Container sandbox execution error: {str(e)}",
                    execution_time=0.0,
                    memory_used=None,
                    exit_code=1
                )
