from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime.datetime
    projects_count: int = 0
    saved_count: int = 0
    problems_solved: int = 0
    ai_requests: int = 0

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Execution Schemas ---
class ExecutionRequest(BaseModel):
    language: str # c, cpp, python, java, javascript
    code: str
    input: Optional[str] = ""
    stdin: Optional[str] = ""
    title: Optional[str] = "Untitled"
    project_id: Optional[int] = None
    file_id: Optional[int] = None
    files: Optional[List[Dict[str, Any]]] = None
    entry_file: Optional[str] = None

class ExecutionResponse(BaseModel):
    status: str # Accepted, Compilation Error, Runtime Error, Time Limit Exceeded, Memory Limit Exceeded, Execution Failed
    output: str = ""
    error: str = ""
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    execution_time: float = 0.0 # seconds
    memory_used: Optional[float] = None # MB or null
    memory_mb: float = 0.0 # MB
    raw_error: Optional[str] = None
    language: str = ""


# --- Project & File Schemas ---
class ProjectFileCreate(BaseModel):
    name: str
    path: Optional[str] = "/"
    content: Optional[str] = ""
    language: Optional[str] = "c"
    is_folder: Optional[bool] = False
    parent_id: Optional[int] = None

class ProjectFileUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    language: Optional[str] = None

class ProjectFileResponse(BaseModel):
    id: int
    project_id: int
    name: str
    path: str
    content: str
    language: str
    is_folder: bool
    parent_id: Optional[int] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    language: Optional[str] = "c"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    language: str
    files: List[ProjectFileResponse] = []
    file_count: int = 0
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Snippet Schemas ---
class SnippetCreate(BaseModel):
    title: str
    language: str
    code: str
    stdin: Optional[str] = ""

class SnippetUpdate(BaseModel):
    title: Optional[str] = None
    language: Optional[str] = None
    code: Optional[str] = None
    stdin: Optional[str] = None

class SnippetResponse(BaseModel):
    id: int
    title: str
    language: str
    code: str
    stdin: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Execution History Schemas ---
class HistoryItemResponse(BaseModel):
    id: int
    title: str
    language: str
    code: str
    stdin: str
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float
    memory_mb: float
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- AI Assistant Schemas ---
class AIActionRequest(BaseModel):
    action: Optional[str] = "" # explain, debug, find_error, fix, optimize, testcases, generate, ask
    language: str
    code: Optional[str] = ""
    selected_code: Optional[str] = ""
    prompt: Optional[str] = ""
    target_language: Optional[str] = None

class AIResponse(BaseModel):
    action: str
    content: str
    generated_code: Optional[str] = None
    language: Optional[str] = None
    summary: Optional[str] = None


# --- Competitive Practice Schemas ---
class ProblemListItem(BaseModel):
    id: int
    slug: str
    title: str
    difficulty: str
    category: str

class ProblemDetail(BaseModel):
    id: int
    slug: str
    title: str
    difficulty: str
    category: str
    description: str
    input_format: str
    output_format: str
    constraints: str
    examples: List[Dict[str, Any]]
    starter_templates: Dict[str, str]

class TestCaseVerdict(BaseModel):
    id: int
    is_hidden: bool
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    error: Optional[str] = None

class ProblemSubmitRequest(BaseModel):
    language: str
    code: str

class ProblemSubmitResponse(BaseModel):
    status: str # Accepted, Wrong Answer, Compilation Error, Time Limit Exceeded
    passed_count: int
    total_count: int
    test_cases: List[TestCaseVerdict]
    execution_time: float


# --- Visual Execution Schemas ---
class VisualizerRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = ""

class VariableState(BaseModel):
    name: str
    type: str
    value: Any

class VisualStep(BaseModel):
    step_number: int
    line_number: int
    code_line: str
    description: str
    variables: Dict[str, Any]
    arrays: Dict[str, List[Any]] = {}
    linked_lists: Dict[str, List[Any]] = {}
    output: str = ""

class VisualizerResponse(BaseModel):
    steps: List[VisualStep]
    total_steps: int
    language: str
