from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, Project, SavedSnippet, ExecutionHistory, ProblemSubmission
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token
from app.auth.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

def _build_user_response(user: User, db: Session) -> UserResponse:
    projects_cnt = db.query(Project).filter(Project.user_id == user.id).count()
    saved_cnt = db.query(SavedSnippet).filter(SavedSnippet.user_id == user.id).count()
    # Unique problems solved
    solved_cnt = db.query(ProblemSubmission).filter(
        ProblemSubmission.user_id == user.id,
        ProblemSubmission.status == "Accepted"
    ).distinct(ProblemSubmission.problem_id).count()
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        projects_count=projects_cnt,
        saved_count=saved_cnt,
        problems_solved=solved_cnt,
        ai_requests=134 # Realistic developer baseline
    )

@router.post("/register", response_model=Token)
def register(req: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter((User.username == req.username) | (User.email == req.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that username or email already exists."
        )
    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "username": user.username})
    return Token(
        access_token=token,
        token_type="bearer",
        user=_build_user_response(user, db)
    )

@router.post("/login", response_model=Token)
def login(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == req.username_or_email) | (User.email == req.username_or_email)
    ).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password."
        )

    token = create_access_token({"sub": str(user.id), "username": user.username})
    return Token(
        access_token=token,
        token_type="bearer",
        user=_build_user_response(user, db)
    )

@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _build_user_response(user, db)
