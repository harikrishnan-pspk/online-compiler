import re
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.execution.executor_factory import ExecutorFactory
from app.execution.base_executor import ExecutionResult
from app.models.models import ExecutionHistory, User

LINE_ERROR_REGEXES = [
    # GCC/Clang: main.c:5:10: error: ... or main.cpp:8:5: error: ...
    re.compile(r'(?:main\.[a-z]+|prog\.[a-z]+|[a-zA-Z0-9_\-\.]+):(\d+):(?:(\d+):)?\s*(error|warning|fatal error):?\s*(.*)', re.IGNORECASE),
    # Python: File "main.py", line 5, in ...
    re.compile(r'File ".*?", line (\d+)(?:, in .*)?', re.IGNORECASE),
    # Java: Main.java:5: error: ... or prog.java:5: error: ...
    re.compile(r'(?:[A-Za-z0-9_]+\.java):(\d+):\s*(error):?\s*(.*)', re.IGNORECASE),
    # Node/JS: /path/main.js:5 or main.js:5:10
    re.compile(r'(?:main\.js|index\.js|[a-zA-Z0-9_\-\.]+):(\d+)(?::(\d+))?', re.IGNORECASE),
]

def extract_error_positions(stderr: str) -> List[Dict[str, Any]]:
    """
    Parses compiler and runtime error strings to pinpoint line/col numbers
    for clickable line jumping in Monaco Editor.
    """
    errors = []
    for line in stderr.splitlines():
        line_clean = line.strip()
        for rx in LINE_ERROR_REGEXES:
            match = rx.search(line_clean)
            if match:
                line_no = int(match.group(1))
                col_no = int(match.group(2)) if match.lastindex and match.lastindex >= 2 and match.group(2) else 1
                errors.append({
                    "line": line_no,
                    "column": col_no,
                    "message": line_clean
                })
                break
    return errors

def requires_stdin(code: str, language: str) -> bool:
    """
    Checks if source code uses standard input functions.
    """
    lang = (language or "").lower().strip()
    if lang in ("c", "cpp"):
        patterns = [
            r'\bscanf\s*\(',
            r'\bcin\s*>>',
            r'\bgetchar\s*\(',
            r'\bgetc\s*\(',
            r'\bfgetc\s*\(',
            r'\bfgets\s*\([^,]+,[^,]+,\s*stdin\b',
            r'\breadline\s*\(',
        ]
        return any(re.search(p, code) for p in patterns)
    elif lang in ("python", "py"):
        return bool(re.search(r'\b(input|sys\.stdin\.read|sys\.stdin\.readline)\s*\(', code))
    elif lang == "java":
        return bool(re.search(r'\b(Scanner|BufferedReader|System\.in\.read)\b', code))
    elif lang in ("javascript", "js"):
        return bool(re.search(r'\b(readline|readFileSync\s*\(\s*0\s*\))\b', code))
    return False

def run_code_and_record(
    db: Session,
    language: str,
    code: str,
    stdin: str = "",
    title: str = "Untitled",
    user_id: Optional[int] = None,
    files: Optional[List[Dict[str, Any]]] = None,
    entry_file: Optional[str] = None
) -> ExecutionResult:
    """
    Routes execution to the proper language executor via ExecutorFactory,
    captures full execution metrics, and persists the record into ExecutionHistory.
    """
    clean_stdin = (stdin or "").replace("\r\n", "\n").replace("\r", "\n")
    if clean_stdin and not clean_stdin.endswith("\n"):
        clean_stdin += "\n"

    stdin_data = clean_stdin
    print("EXECUTOR STDIN:", repr(stdin_data))
    print(f"Executor stdin length: {len(stdin_data)}")

    executor = ExecutorFactory.get_executor(language)
    result = executor.execute(code=code, stdin=stdin_data, files=files, entry_file=entry_file)

    # Persist in execution history
    try:
        history_entry = ExecutionHistory(
            user_id=user_id,
            title=title or "Untitled",
            language=language,
            code=code,
            stdin=clean_stdin,
            stdout=result.stdout,
            stderr=result.stderr,
            exit_code=result.exit_code,
            execution_time=result.execution_time,
            memory_mb=result.memory_used if result.memory_used is not None else 0.0,
            status=result.status
        )
        db.add(history_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger("CodeForge").warning(f"Could not persist execution history: {e}")

    return result
