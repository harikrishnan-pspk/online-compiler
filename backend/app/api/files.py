from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import ProjectFile
from app.schemas.schemas import ProjectFileCreate, ProjectFileUpdate, ProjectFileResponse

router = APIRouter(prefix="/api/files", tags=["files"])

@router.post("", response_model=ProjectFileResponse)
def create_file(req: ProjectFileCreate, db: Session = Depends(get_db)):
    file_obj = ProjectFile(
        project_id=req.project_id if hasattr(req, "project_id") and req.project_id else 1,
        name=req.name,
        path=req.path or f"/{req.name}",
        content=req.content or "",
        language=req.language or "c",
        is_folder=req.is_folder or False,
        parent_id=req.parent_id
    )
    db.add(file_obj)
    db.commit()
    db.refresh(file_obj)
    return file_obj

@router.put("/{id}", response_model=ProjectFileResponse)
def update_file(id: int, req: ProjectFileUpdate, db: Session = Depends(get_db)):
    file_obj = db.query(ProjectFile).filter(ProjectFile.id == id).first()
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    if req.name is not None:
        file_obj.name = req.name
    if req.content is not None:
        file_obj.content = req.content
    if req.language is not None:
        file_obj.language = req.language
    db.commit()
    db.refresh(file_obj)
    return file_obj

@router.delete("/{id}")
def delete_file(id: int, db: Session = Depends(get_db)):
    file_obj = db.query(ProjectFile).filter(ProjectFile.id == id).first()
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    db.delete(file_obj)
    db.commit()
    return {"message": "File deleted successfully"}
