from fastapi import APIRouter
from app.schemas.schemas import AIActionRequest, AIResponse
from app.ai.assistant import AIAssistant

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/explain", response_model=AIResponse)
def explain_code(req: AIActionRequest):
    res = AIAssistant.process_action(
        action="explain",
        language=req.language,
        code=req.code or "",
        selected_code=req.selected_code or "",
        prompt=req.prompt or ""
    )
    return AIResponse(**res)

@router.post("/debug", response_model=AIResponse)
@router.post("/find_error", response_model=AIResponse)
def debug_code(req: AIActionRequest):
    res = AIAssistant.process_action(
        action="find_error" if req.action == "find_error" else "debug",
        language=req.language,
        code=req.code or "",
        selected_code=req.selected_code or "",
        prompt=req.prompt or ""
    )
    return AIResponse(**res)

@router.post("/fix", response_model=AIResponse)
def fix_code(req: AIActionRequest):
    res = AIAssistant.process_action(
        action="fix",
        language=req.language,
        code=req.code or "",
        selected_code=req.selected_code or "",
        prompt=req.prompt or ""
    )
    return AIResponse(**res)

@router.post("/optimize", response_model=AIResponse)
def optimize_code(req: AIActionRequest):
    res = AIAssistant.process_action(
        action="optimize",
        language=req.language,
        code=req.code or "",
        selected_code=req.selected_code or "",
        prompt=req.prompt or ""
    )
    return AIResponse(**res)

@router.post("/testcases", response_model=AIResponse)
def generate_test_cases(req: AIActionRequest):
    res = AIAssistant.process_action(
        action="testcases",
        language=req.language,
        code=req.code or "",
        selected_code=req.selected_code or "",
        prompt=req.prompt or ""
    )
    return AIResponse(**res)

@router.post("/generate", response_model=AIResponse)
def generate_code(req: AIActionRequest):
    res = AIAssistant.process_action(
        action="generate",
        language=req.language,
        code=req.code or "",
        prompt=req.prompt or ""
    )
    return AIResponse(**res)

@router.post("/ask", response_model=AIResponse)
def ask_ai(req: AIActionRequest):
    res = AIAssistant.process_action(
        action="ask",
        language=req.language,
        code=req.code or "",
        selected_code=req.selected_code or "",
        prompt=req.prompt or ""
    )
    return AIResponse(**res)
