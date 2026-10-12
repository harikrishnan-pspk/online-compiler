from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import Project, ProjectFile, User
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectFileResponse
from app.auth.security import get_current_user_optional

router = APIRouter(prefix="/api/projects", tags=["projects"])

DEFAULT_PROJECT_FILES = [
    {
        "name": "main.c",
        "path": "/main.c",
        "language": "c",
        "content": (
            "#include <stdio.h>\n\n"
            "int main()\n"
            "{\n"
            "    printf(\"Hello, World!\\n\");\n"
            "    return 0;\n"
            "}\n"
        )
    },
    {
        "name": "helper.c",
        "path": "/helper.c",
        "language": "c",
        "content": (
            "#include <stdio.h>\n\n"
            "void printGreeting(const char* name) {\n"
            "    printf(\"Hello, %s! Ready to forge some code?\\n\", name);\n"
            "}\n"
        )
    },
    {
        "name": "README.md",
        "path": "/README.md",
        "language": "markdown",
        "content": (
            "# My CodeForge Project\n\n"
            "A fast, modern online IDE featuring secure isolated execution containers\n"
            "and an integrated AI coding assistant.\n\n"
            "### Hotkeys:\n"
            "- **Ctrl + Enter**: Run Code\n"
            "- **Ctrl + S**: Save Code\n"
            "- **Ctrl + Space**: Auto-complete\n"
        )
    },
    {
        "name": "input.txt",
        "path": "/input.txt",
        "language": "plaintext",
        "content": "5\n10 20 30 40 50\n"
    }
]

def _seed_default_project(db: Session, user_id: Optional[int] = None) -> Project:
    project = Project(
        user_id=user_id,
        name="MY PROJECT",
        description="Default C Algorithms Project",
        language="c"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    for f in DEFAULT_PROJECT_FILES:
        p_file = ProjectFile(
            project_id=project.id,
            name=f["name"],
            path=f["path"],
            content=f["content"],
            language=f["language"],
            is_folder=False
        )
        db.add(p_file)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(Project)
    if current_user:
        query = query.filter(Project.user_id == current_user.id)
    
    projects = query.all()
    if not projects:
        # Seed default starter project
        default_proj = _seed_default_project(db, current_user.id if current_user else None)
        projects = [default_proj]

    results = []
    for p in projects:
        files = db.query(ProjectFile).filter(ProjectFile.project_id == p.id).all()
        res = ProjectResponse(
            id=p.id,
            user_id=p.user_id,
            name=p.name,
            description=p.description,
            language=p.language,
            files=[ProjectFileResponse.from_orm(f) for f in files],
            file_count=len(files),
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        results.append(res)
    return results

@router.post("", response_model=ProjectResponse)
def create_project(
    req: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    project = Project(
        user_id=current_user.id if current_user else None,
        name=req.name,
        description=req.description,
        language=req.language or "c"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Add default main file based on language
    starter_name = "main.py" if req.language == "python" else ("index.js" if req.language == "javascript" else "main.c")
    main_file = ProjectFile(
        project_id=project.id,
        name=starter_name,
        path=f"/{starter_name}",
        content="// Write your code here\n" if req.language != "python" else "# Write your code here\n",
        language=req.language or "c",
        is_folder=False
    )
    db.add(main_file)
    db.commit()

    files = db.query(ProjectFile).filter(ProjectFile.project_id == project.id).all()
    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        description=project.description,
        language=project.language,
        files=[ProjectFileResponse.from_orm(f) for f in files],
        file_count=len(files),
        created_at=project.created_at,
        updated_at=project.updated_at
    )

@router.get("/{id}", response_model=ProjectResponse)
def get_project(id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    files = db.query(ProjectFile).filter(ProjectFile.project_id == p.id).all()
    return ProjectResponse(
        id=p.id,
        user_id=p.user_id,
        name=p.name,
        description=p.description,
        language=p.language,
        files=[ProjectFileResponse.from_orm(f) for f in files],
        file_count=len(files),
        created_at=p.created_at,
        updated_at=p.updated_at
    )

@router.put("/{id}", response_model=ProjectResponse)
def update_project(id: int, req: ProjectUpdate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if req.name is not None:
        p.name = req.name
    if req.description is not None:
        p.description = req.description
    if req.language is not None:
        p.language = req.language
    db.commit()
    db.refresh(p)
    files = db.query(ProjectFile).filter(ProjectFile.project_id == p.id).all()
    return ProjectResponse(
        id=p.id,
        user_id=p.user_id,
        name=p.name,
        description=p.description,
        language=p.language,
        files=[ProjectFileResponse.from_orm(f) for f in files],
        file_count=len(files),
        created_at=p.created_at,
        updated_at=p.updated_at
    )

@router.delete("/{id}")
def delete_project(id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(p)
    db.commit()
    return {"message": "Project deleted successfully"}
