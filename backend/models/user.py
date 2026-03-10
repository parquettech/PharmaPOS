"""User models for PharmaPOS"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    username: str
    password: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "USER"  # Default to USER for signup, ADMIN is created manually


class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    username: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_login: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    token_type: str
    user: UserResponse
