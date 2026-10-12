from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import ExecutionHistory, User
from app.schemas.schemas import HistoryItemResponse
from app.auth.security import get_current_user_optional

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("", response_model=List[HistoryItemResponse])
def get_execution_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(ExecutionHistory)
    if current_user:
        query = query.filter(ExecutionHistory.user_id == current_user.id)
    
    items = query.order_by(ExecutionHistory.created_at.desc()).limit(limit).all()
    return items

@router.delete("")
def clear_history(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(ExecutionHistory)
    if current_user:
        query = query.filter(ExecutionHistory.user_id == current_user.id)
    query.delete()
    db.commit()
    return {"message": "Execution history cleared"}
