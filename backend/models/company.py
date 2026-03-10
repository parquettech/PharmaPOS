"""Company model"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class CompanyCreate(BaseModel):
    name: str
    gstin: str
    address: Optional[str] = None
    phone: str
    type: Optional[str] = "GENERAL"  # No longer used for filtering - kept for DB compatibility
    dl_no: Optional[str] = None
    email: Optional[str] = None
    state_code: Optional[str] = None
    place_of_supply: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    type: Optional[str] = None
    dl_no: Optional[str] = None
    email: Optional[str] = None
    state_code: Optional[str] = None
    place_of_supply: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    gstin: str
    address: Optional[str] = None
    phone: str
    type: str
    dl_no: Optional[str] = None
    email: Optional[str] = None
    state_code: Optional[str] = None
    place_of_supply: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True
