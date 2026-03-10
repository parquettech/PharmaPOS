"""Stock model"""
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class StockCreate(BaseModel):
    s_no: int
    description: str
    hsn_sac: Optional[str] = None
    batch_no: Optional[str] = None
    exp_date: Optional[str] = None
    qty: Optional[Decimal] = 0
    free: Optional[Decimal] = 0
    discount: Optional[Decimal] = 0
    mrp: Optional[Decimal] = 0
    rate: Optional[Decimal] = 0
    cgst_igst: Optional[Decimal] = 0
    sgst: Optional[Decimal] = 0
    amount: Optional[Decimal] = 0


class StockUpdate(BaseModel):
    s_no: Optional[int] = None
    description: Optional[str] = None
    hsn_sac: Optional[str] = None
    batch_no: Optional[str] = None
    exp_date: Optional[str] = None
    qty: Optional[Decimal] = None
    free: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    mrp: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    cgst_igst: Optional[Decimal] = None
    sgst: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    additive: Optional[bool] = False  # If true, add qty to current; if false, set qty directly


class StockResponse(BaseModel):
    id: int
    s_no: int
    description: str
    hsn_sac: Optional[str] = None
    batch_no: Optional[str] = None
    exp_date: Optional[str] = None
    qty: Optional[float] = 0
    free: Optional[float] = 0
    discount: Optional[float] = 0
    mrp: Optional[float] = 0
    rate: Optional[float] = 0
    cgst_igst: Optional[float] = 0
    sgst: Optional[float] = 0
    amount: Optional[float] = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True
