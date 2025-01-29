from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import os
import base64

from . import models, schemas, security
from .database import get_db
from .encryption import generate_key_from_password, encrypt_data

router = APIRouter()

# Authentication endpoints
@router.post("/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate encryption key from password
    key, _ = generate_key_from_password(form_data.password, user.encryption_salt)
    
    access_token = security.create_access_token(data={
        "sub": user.email,
        "key": base64.urlsafe_b64encode(key).decode()  # Include encryption key in token
    })
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate encryption key and salt
    key, salt = generate_key_from_password(user.password)
    
    # Create user with encryption details
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        encryption_key=base64.urlsafe_b64encode(key).decode(),
        encryption_salt=salt
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Notes endpoints
@router.get("/notes", response_model=List[schemas.Note])
async def get_notes(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Set the encryption key from the token
    user.encryption_key = base64.urlsafe_b64decode(current_user["key"].encode() + b'=' * (-len(current_user["key"]) % 4))
    return user.notes

@router.post("/notes", response_model=schemas.Note, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: schemas.NoteCreate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Set the encryption key from the token
    key = base64.urlsafe_b64decode(current_user["key"].encode() + b'=' * (-len(current_user["key"]) % 4))
    user.encryption_key = key
    
    try:
        # First create note with non-encrypted fields and owner
        db_note = models.Note(
            owner_id=user.id,
            color=note.color,
            is_archived=note.is_archived,
            is_pinned=note.is_pinned,
            owner=user  # Set owner relationship immediately
        )
        
        # Add to session and flush to get the ID
        db.add(db_note)
        db.flush()
        
        # Now set encrypted fields
        if note.title is not None:
            db_note.title = str(note.title)
        if note.content is not None:
            db_note.content = str(note.content)
        
        # Commit the transaction
        db.commit()
        db.refresh(db_note)
        
        # Ensure the note has access to the encryption key for the response
        db_note.owner = user
        db_note.owner.encryption_key = key
        return db_note
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notes/{note_id}", response_model=schemas.Note)
async def get_note(
    note_id: int,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Set the encryption key from the token
    user.encryption_key = base64.urlsafe_b64decode(current_user["key"].encode() + b'=' * (-len(current_user["key"]) % 4))
    
    note = db.query(models.Note).filter(models.Note.id == note_id, models.Note.owner_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.patch("/notes/{note_id}", response_model=schemas.Note)
async def update_note(
    note_id: int,
    note: schemas.NoteUpdate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Set the encryption key from the token
    key = base64.urlsafe_b64decode(current_user["key"].encode() + b'=' * (-len(current_user["key"]) % 4))
    user.encryption_key = key
    
    db_note = db.query(models.Note).filter(models.Note.id == note_id, models.Note.owner_id == user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Set owner and encryption key before updating fields
    db_note.owner = user
    
    try:
        # Update fields one by one to ensure proper encryption
        if note.title is not None:
            db_note.title = str(note.title)
        if note.content is not None:
            db_note.content = str(note.content)
        if note.color is not None:
            db_note.color = note.color
        if note.is_archived is not None:
            db_note.is_archived = note.is_archived
        if note.is_pinned is not None:
            db_note.is_pinned = note.is_pinned
        
        db.commit()
        db.refresh(db_note)
        
        # Ensure the note has access to the encryption key for the response
        db_note.owner = user
        db_note.owner.encryption_key = key
        return db_note
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    note = db.query(models.Note).filter(models.Note.id == note_id, models.Note.owner_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return None

# Attachments endpoints
@router.post("/notes/{note_id}/attachments", response_model=schemas.Attachment, status_code=status.HTTP_201_CREATED)
async def create_attachment(
    note_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Set the encryption key from the token
    key = base64.urlsafe_b64decode(current_user["key"].encode() + b'=' * (-len(current_user["key"]) % 4))
    user.encryption_key = key
    
    note = db.query(models.Note).filter(models.Note.id == note_id, models.Note.owner_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Set owner and encryption key for the note
    note.owner = user
    
    try:
        content = await file.read()
        attachment = models.Attachment(
            note_id=note.id,
            note=note  # Set note relationship immediately
        )
        
        # Add to session and flush to get the ID
        db.add(attachment)
        db.flush()
        
        # Now set encrypted fields
        attachment.filename = file.filename
        attachment.content_type = file.content_type
        attachment.data = content
        
        db.commit()
        db.refresh(attachment)
        
        # Ensure the attachment has access to the encryption key for the response
        attachment.note = note
        attachment.note.owner = user
        attachment.note.owner.encryption_key = key
        return attachment
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notes/{note_id}/attachments", response_model=List[schemas.Attachment])
async def get_attachments(
    note_id: int,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Set the encryption key from the token
    key = base64.urlsafe_b64decode(current_user["key"].encode() + b'=' * (-len(current_user["key"]) % 4))
    user.encryption_key = key
    
    note = db.query(models.Note).filter(models.Note.id == note_id, models.Note.owner_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Set owner and encryption key for the note
    note.owner = user
    
    # Get attachments and ensure they have access to the encryption key
    attachments = note.attachments
    for attachment in attachments:
        attachment.note = note
        attachment.note.owner = user
        attachment.note.owner.encryption_key = key
    
    return attachments

@router.delete("/notes/{note_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    note_id: int,
    attachment_id: int,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Set the encryption key from the token
    key = base64.urlsafe_b64decode(current_user["key"].encode() + b'=' * (-len(current_user["key"]) % 4))
    user.encryption_key = key
    
    note = db.query(models.Note).filter(models.Note.id == note_id, models.Note.owner_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Set owner and encryption key for the note
    note.owner = user
    
    attachment = db.query(models.Attachment).filter(
        models.Attachment.id == attachment_id,
        models.Attachment.note_id == note.id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    db.delete(attachment)
    db.commit()
    return None 