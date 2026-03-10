"""Purchase model"""
from pydantic import BaseModel, field_validator
from typing import Optional, List, Union
from datetime import date
from decimal import Decimal


class PurchaseItemCreate(BaseModel):
    description: str
    hsn: Optional[str] = None
    batch: Optional[str] = None
    expiry: Optional[Union[date, str]] = None
    qty: Decimal = 0
    free: Decimal = 0
    disc_percent: Decimal = 0
    mrp: Decimal = 0
    price: Decimal = 0
    gst_percent: Decimal = 0
    cgst_amount: Decimal = 0
    sgst_amount: Decimal = 0
    amount: Decimal = 0
    
    @field_validator('expiry', mode='before')
    @classmethod
    def validate_expiry(cls, v):
        """Convert empty string to None, and parse string dates"""
        if v is None or v == '':
            return None
        if isinstance(v, str):
            if v.strip() == '':
                return None
            # Try to parse the date string (YYYY-MM-DD format)
            try:
                return date.fromisoformat(v)
            except ValueError:
                return None
        return v


class PurchaseItemResponse(BaseModel):
    id: int
    purchase_id: int
    description: str
    hsn: Optional[str] = None
    batch: Optional[str] = None
    expiry: Optional[str] = None
    qty: Decimal
    free: Decimal
    disc_percent: Decimal
    mrp: Decimal
    price: Decimal
    gst_percent: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    amount: Decimal
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class PurchaseCreate(BaseModel):
    supplier_id: int
    middleman_id: Optional[int] = None
    invoice_no: Optional[str] = None
    bill_no: Optional[str] = None
    purchase_date: Union[date, str]
    order_date: Optional[Union[date, str]] = None
    order_no: Optional[str] = None
    terms: Optional[str] = 'CASH/CREDIT'
    paid_amount: Decimal = 0
    items: List[PurchaseItemCreate]
    
    @field_validator('order_date', mode='before')
    @classmethod
    def validate_order_date(cls, v):
        """Parse string dates to date object"""
        if v is None or v == '':
            return None
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                return None
        return v
    
    @field_validator('purchase_date', mode='before')
    @classmethod
    def validate_purchase_date(cls, v):
        """Parse string dates to date object"""
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                raise ValueError(f"Invalid date format: {v}. Expected YYYY-MM-DD")
        return v


class PurchaseResponse(BaseModel):
    id: int
    supplier_id: int
    middleman_id: Optional[int] = None
    invoice_no: Optional[str] = None
    bill_no: Optional[str] = None
    purchase_date: str
    order_date: Optional[str] = None
    order_no: Optional[str] = None
    terms: Optional[str] = 'CASH/CREDIT'
    paid_amount: Decimal
    gross_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    total_amount: Decimal
    rounded_amount: Optional[Decimal] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    items: List[PurchaseItemResponse] = []
    
    class Config:
        from_attributes = True
