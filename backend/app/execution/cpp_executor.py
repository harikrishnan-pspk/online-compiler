import shutil
import tempfile
import os
import subprocess
import time
from typing import Optional, List
from app.execution.base_executor import BaseExecutor, ExecutionResult
from app.core.config import settings

class CppExecutor(BaseExecutor):
    """
    Executor for C++ code.
    Attempts local G++ compilation if installed; otherwise utilizes isolated G++ 23 container sandbox.
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

        # Check if local g++ or clang++ is available
        from app.execution.compiler_registry import get_gcc_toolchain
        gpp_bin = get_gcc_toolchain(cpp=True)
        if gpp_bin:
            return self._execute_local_cpp(gpp_bin, code, stdin, timeout, files, entry_file)

        # Otherwise execute in secure isolated container sandbox
        return self._execute_container_sandbox(
            compiler="gcc-13.2.0",
            code=code,
            stdin=stdin,
            timeout=timeout,
            compiler_options="-O2\n-Wall"
        )

    def _execute_local_cpp(
        self,
        gpp_bin: str,
        code: str,
        stdin: str,
        timeout: int,
        files: Optional[list] = None,
        entry_file: Optional[str] = None
    ) -> ExecutionResult:
        temp_dir = tempfile.mkdtemp(prefix="codeforge_cpp_")
        try:
            self._materialize_files(temp_dir, files, entry_file or "main.cpp", code)
            out_bin = os.path.join(temp_dir, "main.exe" if os.name == "nt" else "main")

            src_files = [os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.endswith((".cpp", ".cc", ".cxx"))]
            if not src_files:
                src_files = [os.path.join(temp_dir, "main.cpp")]

            # 1. Compile with C++17 standard
            compile_start = time.time()
            compile_proc = subprocess.run(
                [gpp_bin, "-std=c++17", "-O2", "-Wall", "-I", temp_dir] + src_files + ["-o", out_bin],
                capture_output=True,
                text=True,
                cwd=temp_dir,
                timeout=15
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
                estimated_mem=6.2
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
