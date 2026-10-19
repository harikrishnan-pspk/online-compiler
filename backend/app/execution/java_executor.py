import shutil
import tempfile
import os
import subprocess
import time
import re
from typing import Optional, List
from app.execution.base_executor import BaseExecutor, ExecutionResult
from app.core.config import settings

class JavaExecutor(BaseExecutor):
    """
    Executor for Java code.
    Attempts local OpenJDK / javac compilation if installed;
    otherwise executes inside isolated OpenJDK 22 container sandbox.
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

        # Detect class name in user code
        class_match = re.search(r'(?:public\s+)?class\s+([A-Za-z0-9_]+)', code)
        class_name = os.path.splitext(entry_file)[0] if entry_file else (class_match.group(1) if class_match else "Main")

        from app.execution.compiler_registry import get_jdk_toolchain
        javac_bin, java_bin = get_jdk_toolchain()

        if javac_bin and java_bin and (os.path.isfile(javac_bin) or shutil.which(javac_bin)) and (os.path.isfile(java_bin) or shutil.which(java_bin)):
            return self._execute_local_java(javac_bin, java_bin, class_name, code, stdin, timeout, files, entry_file)

        # Container sandbox execution: Wandbox compiles as 'prog.java', so replace 'public class <Name>' with 'class <Name>'
        container_code = re.sub(r'public\s+class\s+([A-Za-z0-9_]+)', r'class \1', code)
        return self._execute_container_sandbox(
            compiler="openjdk-jdk-22+36",
            code=container_code,
            stdin=stdin,
            timeout=timeout
        )

    def _execute_local_java(
        self,
        javac_bin: str,
        java_bin: str,
        class_name: str,
        code: str,
        stdin: str,
        timeout: int,
        files: Optional[list] = None,
        entry_file: Optional[str] = None
    ) -> ExecutionResult:
        temp_dir = tempfile.mkdtemp(prefix="codeforge_java_")
        try:
            self._materialize_files(temp_dir, files, entry_file or f"{class_name}.java", code)

            java_files = [os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.endswith(".java")]
            if not java_files:
                java_files = [os.path.join(temp_dir, f"{class_name}.java")]

            # 1. Compile
            compile_start = time.time()
            compile_proc = subprocess.run(
                [javac_bin] + java_files,
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

            # 2. Run JVM with memory limit
            res = self._execute_local_process(
                command=[java_bin, "-Xmx256m", "-cp", temp_dir, class_name],
                cwd=temp_dir,
                stdin=stdin,
                timeout=timeout,
                estimated_mem=28.4
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
