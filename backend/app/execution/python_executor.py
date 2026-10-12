import tempfile
import os
import sys
import shutil
from typing import Optional, List
from app.execution.base_executor import BaseExecutor, ExecutionResult
from app.core.config import settings

class PythonExecutor(BaseExecutor):
    """
    Executor for Python code.
    Runs code inside an ephemeral isolated directory using the Python interpreter
    with memory limits, timeouts, and stdin piping.
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

        temp_dir = tempfile.mkdtemp(prefix="codeforge_py_")
        try:
            entry_name = entry_file or "main.py"
            self._materialize_files(temp_dir, files, entry_name, code)
            script_path = os.path.join(temp_dir, entry_name)

            python_bin = sys.executable or "python"
            res = self._execute_local_process(
                command=[python_bin, "-u", script_path],
                cwd=temp_dir,
                stdin=stdin,
                timeout=timeout,
                estimated_mem=12.4
            )

            # Refine error status: if SyntaxError or IndentationError, mark as Compilation Error
            if res.exit_code != 0 and ("SyntaxError:" in res.stderr or "IndentationError:" in res.stderr):
                res.status = "Compilation Error"

            return res
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
