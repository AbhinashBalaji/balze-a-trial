import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
)
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    department_name = Column(String, unique=True, index=True, nullable=False)


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    permissions = relationship("RolePermission", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    permission_name = Column(String, unique=True, index=True, nullable=False)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)

    permission = relationship("Permission")


class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    role = relationship("Role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="User") # Keeping for backwards compatibility if needed, or migrate later
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    status = Column(String, default="Active")
    invite_token = Column(String, unique=True, index=True, nullable=True)
    invite_token_expires = Column(DateTime, nullable=True)
    must_change_password = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    department = relationship("Department")
    roles = relationship("UserRole", cascade="all, delete-orphan")
    files = relationship("FileDoc", back_populates="owner", cascade="all, delete-orphan")
    shares = relationship("FileShare", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    search_logs = relationship("SearchLog", back_populates="user", cascade="all, delete-orphan")


class FileDoc(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    filetype = Column(String, nullable=False)
    filesize = Column(Integer, default=0)
    text_content = Column(Text, default="")
    summary_brief = Column(Text, default="")
    summary_detailed = Column(Text, default="")
    tags = Column(Text, default="")  # comma separated
    visibility = Column(String, default="Internal") # Public, Internal, Confidential, Restricted
    classification = Column(String, default="General")
    status = Column(String, default="processing")  # processing, ready, error
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="files")
    department = relationship("Department")
    chunks = relationship("Chunk", back_populates="file", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="file", cascade="all, delete-orphan")
    shares = relationship("FileShare", back_populates="file", cascade="all, delete-orphan")



class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)  # JSON-encoded list[float]

    file = relationship("FileDoc", back_populates="chunks")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    role = Column(String, nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    file = relationship("FileDoc", back_populates="messages")


class FileShare(Base):
    __tablename__ = "file_shares"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    permission = Column(String, default="View")  # View, Comment, Edit
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    file = relationship("FileDoc", back_populates="shares")
    user = relationship("User", back_populates="shares")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False, index=True)
    details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


class SearchLog(Base):
    __tablename__ = "search_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    query = Column(String, nullable=False)
    search_mode = Column(String, default="hybrid")
    result_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="search_logs")


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    otp_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts_remaining = Column(Integer, default=5)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
