from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import base64

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    key: Optional[str] = None

class AttachmentBase(BaseModel):
    filename: str
    content_type: str

class Attachment(AttachmentBase):
    id: int
    created_at: datetime
    note_id: int
    data: Optional[bytes] = None

    class Config:
        from_attributes = True
        json_encoders = {
            bytes: lambda v: base64.b64encode(v).decode() if v else None
        }

class NoteBase(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = Field(
        default='active',
        description='Note status (active, archived, or trash)',
        pattern='^(active|archived|trash)$'
    )
    is_pinned: Optional[bool] = None
    deleted_at: Optional[datetime] = None

class NoteCreate(NoteBase):
    title: str
    content: str
    status: str = Field(
        default='active',
        description='Note status (active, archived, or trash)',
        pattern='^(active|archived|trash)$'
    )
    is_pinned: bool = False

class NoteUpdate(NoteBase):
    pass

class Note(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    attachments: Optional[List['Attachment']] = []

    class Config:
        from_attributes = True 