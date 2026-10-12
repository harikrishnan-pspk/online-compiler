from fastapi import APIRouter
from app.schemas.schemas import VisualizerRequest, VisualizerResponse
from app.services.visualizer import ExecutionVisualizer

router = APIRouter(prefix="/api", tags=["visualizer"])

@router.post("/visualize", response_model=VisualizerResponse)
def visualize_execution(req: VisualizerRequest):
    return ExecutionVisualizer.trace_execution(
        language=req.language,
        code=req.code,
        stdin=req.stdin or ""
    )
