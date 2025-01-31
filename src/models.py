from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, LargeBinary, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from .encryption import EncryptedField

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    encryption_key = Column(String)  # Stored encrypted with user's password
    encryption_salt = Column(LargeBinary)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = relationship("Note", back_populates="owner")

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    _title = Column("title", String)  # Encrypted title
    _content = Column("content", Text)  # Encrypted content
    color = Column(String, default="#ffffff")
    status = Column(String, default="active")  # active, archived, trash
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)  # When moved to trash
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="notes", lazy="joined")
    attachments = relationship("Attachment", back_populates="note", cascade="all, delete-orphan")

    # Encrypted fields using descriptors
    title = EncryptedField("owner.encryption_key")
    content = EncryptedField("owner.encryption_key")

    def __init__(self, **kwargs):
        # Extract encrypted fields to set after initialization
        title = kwargs.pop('title', None)
        content = kwargs.pop('content', None)
        
        # Initialize other fields
        super().__init__(**kwargs)
        
        # Set encrypted fields if provided
        if title is not None:
            self.title = title
        if content is not None:
            self.content = content

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    _filename = Column("filename", String)  # Encrypted filename
    content_type = Column(String)
    _data = Column("data", LargeBinary)  # Encrypted data
    created_at = Column(DateTime, default=datetime.utcnow)
    note_id = Column(Integer, ForeignKey("notes.id"))
    note = relationship("Note", back_populates="attachments")

    # Encrypted fields using descriptors
    filename = EncryptedField("note.owner.encryption_key")
    data = EncryptedField("note.owner.encryption_key", is_binary=True)

    def __init__(self, **kwargs):
        # Extract encrypted fields to set after initialization
        filename = kwargs.pop('filename', None)
        data = kwargs.pop('data', None)
        
        # Initialize other fields
        super().__init__(**kwargs)
        
        # Set encrypted fields if provided
        if filename is not None:
            self.filename = filename
        if data is not None:
            self.data = data 