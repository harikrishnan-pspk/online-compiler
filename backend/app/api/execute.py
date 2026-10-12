import json
import time
import asyncio
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.schemas.schemas import ExecutionRequest, ExecutionResponse
from app.execution.runner import run_code_and_record
from app.execution.interactive_session import InteractiveSession
from app.auth.security import get_current_user_optional
from app.models.models import User, ExecutionHistory

router = APIRouter(prefix="/api", tags=["execution"])

@router.post("/execute", response_model=ExecutionResponse)
def execute_code(
    request: ExecutionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    print("BACKEND STDIN:", repr(request.input))

    user_id = current_user.id if current_user else None
    # Support both 'input' and 'stdin' fields with clean precedence and CRLF normalization
    raw_stdin = request.input if (request.input is not None and request.input != "") else (request.stdin or "")
    stdin_content = raw_stdin.replace("\r\n", "\n").replace("\r", "\n")

    print(f"Received language: {request.language}")
    print(f"Received stdin length: {len(stdin_content)}")
    print(f"Received stdin repr: {repr(stdin_content)}")

    try:
        res = run_code_and_record(
            db=db,
            language=request.language,
            code=request.code,
            stdin=stdin_content,
            title=request.title or "Untitled",
            user_id=user_id,
            files=request.files,
            entry_file=request.entry_file
        )

        print(f"\n================ [EXECUTION DEV LOG: RESULT] ===============")
        print(f"Language:       {request.language}")
        print(f"Stdin Length:   {len(stdin_content)}")
        print(f"Stdin Repr:     {repr(stdin_content)}")
        print(f"Exit Code:      {res.exit_code}")
        print(f"Status:         {res.status}")
        print(f"Stdout:         {repr(res.stdout)}")
        print(f"Stderr:         {repr(res.stderr)}")
        print(f"============================================================")

        return ExecutionResponse(
            status=res.status,
            output=res.stdout,
            error=res.stderr,
            stdout=res.stdout,
            stderr=res.stderr,
            exit_code=res.exit_code,
            execution_time=round(res.execution_time, 3),
            memory_used=round(res.memory_used, 2) if res.memory_used is not None else None,
            memory_mb=round(res.memory_used, 2) if res.memory_used is not None else 0.0,
            raw_error=res.stderr if res.stderr else None,
            language=request.language
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Execution service error: {str(e)}"
        )


@router.websocket("/execute/interactive")
async def websocket_interactive_execute(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time interactive execution with true bidirectional stdin/stdout streaming.
    Supports user keyboard interaction for scanf, cin, input(), etc.
    """
    await websocket.accept()

    session: Optional[InteractiveSession] = None
    loop = asyncio.get_running_loop()
    msg_queue: asyncio.Queue = asyncio.Queue()
    accumulated_stdout = []
    accumulated_stderr = []
    session_title = "Untitled"
    session_lang = "c"
    session_code = ""

    def on_stdout(chunk: str):
        accumulated_stdout.append(chunk)
        loop.call_soon_threadsafe(msg_queue.put_nowait, {"type": "stdout", "data": chunk})

    def on_stderr(chunk: str):
        accumulated_stderr.append(chunk)
        loop.call_soon_threadsafe(msg_queue.put_nowait, {"type": "stderr", "data": chunk})

    def on_exit(code: int, status: str, duration: float):
        loop.call_soon_threadsafe(msg_queue.put_nowait, {
            "type": "exit",
            "code": code,
            "status": status,
            "execution_time": duration
        })

    async def forward_outgoing():
        try:
            while True:
                msg = await msg_queue.get()
                await websocket.send_json(msg)
                msg_queue.task_done()
        except Exception:
            pass

    forward_task = asyncio.create_task(forward_outgoing())

    try:
        while True:
            raw_msg = await websocket.receive_text()
            try:
                data = json.loads(raw_msg)
            except Exception:
                continue

            msg_type = data.get("type")

            if msg_type == "start":
                if session:
                    session.stop()

                session_lang = data.get("language", "c")
                session_code = data.get("code", "")
                session_title = data.get("title", "Untitled")
                accumulated_stdout.clear()
                accumulated_stderr.clear()

                session = InteractiveSession(
                    language=session_lang,
                    code=session_code,
                    on_stdout=on_stdout,
                    on_stderr=on_stderr,
                    on_exit=on_exit,
                    files=data.get("files"),
                    entry_file=data.get("entry_file")
                )
                started = session.start()
                preloaded = data.get("stdin") or data.get("input") or ""
                if started and preloaded:
                    session.send_stdin(preloaded)

            elif msg_type == "stdin":
                text = data.get("data", "")
                if session:
                    session.send_stdin(text)

            elif msg_type == "stop":
                if session:
                    session.stop()
                    loop.call_soon_threadsafe(msg_queue.put_nowait, {
                        "type": "exit",
                        "code": 130,
                        "status": "Terminated",
                        "execution_time": round(time.time() - session.start_time, 3)
                    })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        pass
    finally:
        if session:
            session.stop()
        if forward_task and not forward_task.done():
            forward_task.cancel()

        # Save record in ExecutionHistory
        if session_code and session:
            try:
                exit_c = 0
                if session.process and session.process.returncode is not None:
                    exit_c = session.process.returncode
                hist = ExecutionHistory(
                    title=session_title,
                    language=session_lang,
                    code=session_code,
                    stdin="[Interactive Stdin]",
                    stdout="".join(accumulated_stdout),
                    stderr="".join(accumulated_stderr),
                    exit_code=exit_c,
                    execution_time=round(time.time() - session.start_time, 3),
                    memory_mb=4.2,
                    status="Accepted" if exit_c == 0 else "Runtime Error"
                )
                db.add(hist)
                db.commit()
            except Exception:
                pass

