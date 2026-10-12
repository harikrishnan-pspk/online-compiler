from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import ProblemListItem, ProblemDetail, ProblemSubmitRequest, ProblemSubmitResponse
from app.services.practice_service import PracticeService
from app.auth.security import get_current_user_optional

router = APIRouter(prefix="/api/practice", tags=["practice"])

@router.get("/problems", response_model=List[ProblemListItem])
def get_problems(db: Session = Depends(get_db)):
    return PracticeService.get_all_problems(db)

@router.get("/problems/{slug}", response_model=ProblemDetail)
def get_problem(slug: str, db: Session = Depends(get_db)):
    problem = PracticeService.get_problem_by_slug(db, slug)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem

@router.post("/problems/{id}/submit", response_model=ProblemSubmitResponse)
def submit_solution(
    id: int,
    req: ProblemSubmitRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    try:
        return PracticeService.evaluate_submission(
            db=db,
            problem_id=id,
            language=req.language,
            code=req.code,
            user_id=current_user.id if current_user else None
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error evaluating submission against test cases")
