import shutil
import tempfile
import os
from typing import Optional, List
from app.execution.base_executor import BaseExecutor, ExecutionResult
from app.core.config import settings

class JavaScriptExecutor(BaseExecutor):
    """
    Executor for JavaScript code.
    Runs code inside an ephemeral isolated directory using Node.js
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

        node_bin = shutil.which("node")
        if node_bin:
            temp_dir = tempfile.mkdtemp(prefix="codeforge_js_")
            try:
                entry_name = entry_file or "main.js"
                self._materialize_files(temp_dir, files, entry_name, code)
                script_path = os.path.join(temp_dir, entry_name)

                res = self._execute_local_process(
                    command=[node_bin, script_path],
                    cwd=temp_dir,
                    stdin=stdin,
                    timeout=timeout,
                    estimated_mem=18.6
                )

                # If SyntaxError, mark as Compilation Error
                if res.exit_code != 0 and "SyntaxError:" in res.stderr:
                    res.status = "Compilation Error"

                return res
            finally:
                shutil.rmtree(temp_dir, ignore_errors=True)

        # Fallback to container sandbox
        return self._execute_container_sandbox(
            compiler="nodejs-20.17.0",
            code=code,
            stdin=stdin,
            timeout=timeout
        )
