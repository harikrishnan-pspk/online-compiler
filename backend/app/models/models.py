import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    saved_snippets = relationship("SavedSnippet", back_populates="owner", cascade="all, delete-orphan")
    execution_history = relationship("ExecutionHistory", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("ProblemSubmission", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    language = Column(String(30), default="c")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    owner = relationship("User", back_populates="projects")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")


class ProjectFile(Base):
    __tablename__ = "project_files"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(100), nullable=False)
    path = Column(String(255), default="/")
    content = Column(Text, default="")
    language = Column(String(30), default="c")
    is_folder = Column(Boolean, default=False)
    parent_id = Column(Integer, ForeignKey("project_files.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    project = relationship("Project", back_populates="files")


class SavedSnippet(Base):
    __tablename__ = "saved_snippets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(120), nullable=False)
    language = Column(String(30), nullable=False)
    code = Column(Text, nullable=False)
    stdin = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    owner = relationship("User", back_populates="saved_snippets")


class ExecutionHistory(Base):
    __tablename__ = "execution_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(120), default="Untitled")
    language = Column(String(30), nullable=False)
    code = Column(Text, nullable=False)
    stdin = Column(Text, default="")
    stdout = Column(Text, default="")
    stderr = Column(Text, default="")
    exit_code = Column(Integer, default=0)
    execution_time = Column(Float, default=0.0)
    memory_mb = Column(Float, default=0.0)
    status = Column(String(50), default="Accepted") # Accepted, Compilation Error, Runtime Error, Time Limit Exceeded
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="execution_history")


class Problem(Base):
    __tablename__ = "problems"
    
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(150), nullable=False)
    difficulty = Column(String(20), default="Easy") # Easy, Medium, Hard
    category = Column(String(50), default="Algorithms")
    description = Column(Text, nullable=False)
    input_format = Column(Text, default="")
    output_format = Column(Text, default="")
    constraints = Column(Text, default="")
    examples_json = Column(Text, default="[]")
    starter_templates_json = Column(Text, default="{}")
    test_cases_json = Column(Text, default="[]") # JSON list of {id, input, expected_output, is_hidden}


class ProblemSubmission(Base):
    __tablename__ = "problem_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    language = Column(String(30), nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String(50), default="Accepted") # Accepted, Wrong Answer, Compilation Error, Time Limit Exceeded
    passed_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="submissions")
    problem = relationship("Problem")
