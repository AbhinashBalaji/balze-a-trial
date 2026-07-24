import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str

class AcceptInviteRequest(BaseModel):
    token: str
    password: str

class ChangePasswordRequest(BaseModel):
    new_password: str


class UserCreateAdmin(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str
    role: str = "User"

class UserUpdateStatus(BaseModel):
    status: str

class UserUpdateRole(BaseModel):
    role: str

class UserEdit(BaseModel):
    full_name: str
    email: EmailStr

class UserResetPassword(BaseModel):
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str = "User"
    status: str = "Active"
    must_change_password: bool = False
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class FileOut(BaseModel):
    id: int
    filename: str
    filetype: str
    filesize: int
    status: str
    tags: Optional[str] = ""
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class FileShareCreate(BaseModel):
    user_id: int
    permission: str

class FileShareUpdate(BaseModel):
    permission: str

class FileShareOut(BaseModel):
    id: int
    file_id: int
    user_id: int
    permission: str
    created_at: datetime.datetime
    user: UserOut

    class Config:
        from_attributes = True


class FileDetailOut(FileOut):
    text_content: str
    summary_brief: Optional[str] = ""
    summary_detailed: Optional[str] = ""


class ChatRequest(BaseModel):
    question: str


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class SummarizeRequest(BaseModel):
    mode: str = "brief"  # brief | detailed


class TranslateRequest(BaseModel):
    target_language: str


class TranslateResponse(BaseModel):
    translated_text: str


class SearchResultItem(BaseModel):
    file_id: int
    filename: str
    chunk_index: int
    content: str
    score: float


class SearchResponse(BaseModel):
    answer: Optional[str] = None
    results: List[SearchResultItem]


class KnowledgeGraphNode(BaseModel):
    id: str
    label: str
    type: str


class KnowledgeGraphEdge(BaseModel):
    source: str
    target: str
    relation: str


class KnowledgeGraphResponse(BaseModel):
    nodes: List[KnowledgeGraphNode]
    edges: List[KnowledgeGraphEdge]


class CompareRequest(BaseModel):
    file_id_a: int
    file_id_b: int


class CompareResponse(BaseModel):
    similarities: str
    differences: str
    verdict: str
