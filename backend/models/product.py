"""Product model for batch-based lookup"""
from pydantic import BaseModel, field_validator
from typing import Optional, Union
from datetime import date
from decimal import Decimal


class ProductCreate(BaseModel):
    batch_no: str
    description: str
    hsn_sac: Optional[str] = None
    expiry: Optional[Union[date, str]] = None
    mrp: Decimal = 0
    default_rate: Decimal = 0
    default_disc_percent: Decimal = 0
    default_gst_percent: Decimal = 0
    packing: Optional[str] = None
    
    @field_validator('expiry', mode='before')
    @classmethod
    def validate_expiry(cls, v):
        """Convert empty string to None, and parse string dates"""
        if v is None or v == '':
            return None
        if isinstance(v, str):
            if v.strip() == '':
                return None
            try:
                return date.fromisoformat(v)
            except ValueError:
                return None
        return v


class ProductUpdate(BaseModel):
    description: Optional[str] = None
    hsn_sac: Optional[str] = None
    expiry: Optional[Union[date, str]] = None
    mrp: Optional[Decimal] = None
    default_rate: Optional[Decimal] = None
    default_disc_percent: Optional[Decimal] = None
    default_gst_percent: Optional[Decimal] = None
    packing: Optional[str] = None
    
    @field_validator('expiry', mode='before')
    @classmethod
    def validate_expiry(cls, v):
        """Convert empty string to None, and parse string dates"""
        if v is None or v == '':
            return None
        if isinstance(v, str):
            if v.strip() == '':
                return None
            try:
                return date.fromisoformat(v)
            except ValueError:
                return None
        return v


class ProductResponse(BaseModel):
    id: int
    batch_no: str
    description: str
    hsn_sac: Optional[str] = None
    expiry: Optional[str] = None
    mrp: Decimal
    default_rate: Decimal
    default_disc_percent: Decimal
    default_gst_percent: Decimal
    packing: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True
