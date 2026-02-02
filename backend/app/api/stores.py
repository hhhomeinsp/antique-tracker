"""Store API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.store import Store
from app.models.item import Item

router = APIRouter()

# Pydantic schemas
class StoreCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None

class StoreResponse(BaseModel):
    id: int
    name: str
    address: Optional[str]
    city: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class StoreWithUsage(BaseModel):
    id: int
    name: str
    address: Optional[str]
    city: Optional[str]
    notes: Optional[str]
    usage_count: int
    
    class Config:
        from_attributes = True

# Online Marketplaces
ONLINE_MARKETPLACES = [
    {"name": "Facebook Marketplace", "city": "Online"},
    {"name": "eBay", "city": "Online"},
    {"name": "Craigslist", "city": "Online"},
    {"name": "OfferUp", "city": "Online"},
    {"name": "Mercari", "city": "Online"},
    {"name": "Etsy", "city": "Online"},
    {"name": "Poshmark", "city": "Online"},
    {"name": "Nextdoor", "city": "Online"},
    {"name": "Estate Sale", "city": "Various"},
    {"name": "Garage Sale", "city": "Various"},
    {"name": "Auction", "city": "Various"},
    {"name": "Flea Market", "city": "Various"},
    {"name": "Antique Mall", "city": "Various"},
]

# Brevard County thrift stores
BREVARD_STORES = [
    {"name": "Goodwill - Melbourne", "address": "1455 N Harbor City Blvd", "city": "Melbourne"},
    {"name": "Goodwill - Palm Bay", "address": "1140 Malabar Rd SE", "city": "Palm Bay"},
    {"name": "Goodwill - Titusville", "address": "2835 Garden St", "city": "Titusville"},
    {"name": "Goodwill - Merritt Island", "address": "295 E Merritt Island Cswy", "city": "Merritt Island"},
    {"name": "Goodwill - Rockledge", "address": "3830 Murrell Rd", "city": "Rockledge"},
    {"name": "Goodwill - Cocoa", "address": "900 Dixon Blvd", "city": "Cocoa"},
    {"name": "Salvation Army - Melbourne", "address": "4135 W New Haven Ave", "city": "Melbourne"},
    {"name": "Salvation Army - Cocoa", "address": "1275 Dixon Blvd", "city": "Cocoa"},
    {"name": "Salvation Army - Titusville", "address": "4245 S Hopkins Ave", "city": "Titusville"},
    {"name": "SPCA of Brevard Thrift Store - Titusville", "address": "4220 S Washington Ave", "city": "Titusville"},
    {"name": "SPCA of Brevard Thrift Store - Melbourne", "address": "510 E Hibiscus Blvd", "city": "Melbourne"},
    {"name": "Community Thrift", "address": "2425 N Courtenay Pkwy", "city": "Merritt Island"},
    {"name": "Molly Mutt III Thrift Shop", "address": "5575 N Atlantic Ave", "city": "Cocoa Beach"},
    {"name": "Daily Thrift", "address": "3369 Suntree Blvd", "city": "Melbourne"},
    {"name": "Village Thrift", "address": "2275 Palm Bay Rd NE", "city": "Palm Bay"},
    {"name": "Patriots & Paws Thrift Store", "address": "1275 N Courtenay Pkwy", "city": "Merritt Island"},
    {"name": "Brevard Humane Society Thrift", "address": "750 W New Haven Ave", "city": "Melbourne"},
    {"name": "The Shabby Loft", "address": "1500 S Wickham Rd", "city": "West Melbourne"},
    {"name": "The Astronaut's Wife", "address": "208 Brevard Ave", "city": "Cocoa Village"},
    {"name": "Drifthouse", "address": "211 Brevard Ave", "city": "Cocoa Village"},
    {"name": "North Brevard Sharing Center", "address": "4475 S Hopkins Ave", "city": "Titusville"},
    {"name": "Women's Center Upscale Resale", "address": "750 Cone Rd", "city": "Merritt Island"},
    {"name": "Shop of the Gulls", "address": "155 S Atlantic Ave", "city": "Cocoa Beach"},
    {"name": "Beachside Retro & Records", "address": "318 S Atlantic Ave", "city": "Cocoa Beach"},
    {"name": "Home to Home Consignment", "address": "665 N Courtenay Pkwy", "city": "Merritt Island"},
    {"name": "A+ Thrift Shop", "address": "1755 E Merritt Island Cswy", "city": "Merritt Island"},
    {"name": "Second Time Around", "address": "903 Cheney Hwy", "city": "Titusville"},
    {"name": "Habitat ReStore - Melbourne", "address": "4600 Lipscomb St NE", "city": "Palm Bay"},
    {"name": "Habitat ReStore - Rockledge", "address": "1751 Dixon Blvd", "city": "Rockledge"},
    {"name": "Angels Attic Thrift", "address": "2345 N Wickham Rd", "city": "Melbourne"},
    {"name": "Encore Resale", "address": "1120 N Harbor City Blvd", "city": "Melbourne"},
]

# All default stores
DEFAULT_STORES = ONLINE_MARKETPLACES + BREVARD_STORES

@router.get("/", response_model=List[StoreResponse])
def list_stores(db: Session = Depends(get_db)):
    """Get all stores"""
    return db.query(Store).order_by(Store.name).all()

@router.get("/search", response_model=List[StoreWithUsage])
def search_stores(
    q: str = Query(default="", description="Search query"),
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db)
):
    """
    Search stores with fuzzy matching.
    Returns stores sorted by usage count (most used first), then alphabetically.
    If no query, returns most used stores.
    """
    # Subquery to count items per store
    usage_subquery = (
        db.query(
            Item.store_id,
            func.count(Item.id).label('usage_count')
        )
        .group_by(Item.store_id)
        .subquery()
    )
    
    # Main query with left join to get usage counts
    query = (
        db.query(
            Store.id,
            Store.name,
            Store.address,
            Store.city,
            Store.notes,
            func.coalesce(usage_subquery.c.usage_count, 0).label('usage_count')
        )
        .outerjoin(usage_subquery, Store.id == usage_subquery.c.store_id)
    )
    
    # Apply search filter if query provided
    if q.strip():
        search_term = f"%{q.strip().lower()}%"
        query = query.filter(
            func.lower(Store.name).like(search_term) |
            func.lower(Store.city).like(search_term)
        )
    
    # Order by usage count (desc), then alphabetically
    results = (
        query
        .order_by(desc('usage_count'), Store.name)
        .limit(limit)
        .all()
    )
    
    return [
        StoreWithUsage(
            id=r.id,
            name=r.name,
            address=r.address,
            city=r.city,
            notes=r.notes,
            usage_count=r.usage_count
        )
        for r in results
    ]

@router.post("/", response_model=StoreResponse)
def create_store(store: StoreCreate, db: Session = Depends(get_db)):
    """Create a new store"""
    db_store = Store(**store.model_dump())
    db.add(db_store)
    db.commit()
    db.refresh(db_store)
    return db_store

@router.api_route("/seed-brevard", methods=["GET", "POST"])
def seed_brevard_stores(db: Session = Depends(get_db)):
    """Seed database with default stores (online + Brevard County)"""
    added = 0
    for store_data in DEFAULT_STORES:
        # Check if already exists
        existing = db.query(Store).filter(Store.name == store_data["name"]).first()
        if not existing:
            db_store = Store(**store_data)
            db.add(db_store)
            added += 1
    db.commit()
    return {"message": f"Added {added} stores", "total": len(DEFAULT_STORES)}

@router.get("/{store_id}", response_model=StoreResponse)
def get_store(store_id: int, db: Session = Depends(get_db)):
    """Get a specific store"""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@router.patch("/{store_id}", response_model=StoreResponse)
def update_store(store_id: int, store_update: StoreCreate, db: Session = Depends(get_db)):
    """Update a store"""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    update_data = store_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(store, field, value)
    
    db.commit()
    db.refresh(store)
    return store

@router.delete("/{store_id}")
def delete_store(store_id: int, db: Session = Depends(get_db)):
    """Delete a store"""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    db.delete(store)
    db.commit()
    return {"message": "Store deleted"}
