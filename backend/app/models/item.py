"""Item model"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class ItemCondition(str, enum.Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class ItemCategory(str, enum.Enum):
    FURNITURE = "furniture"
    ART = "art"
    VASES = "vases"
    FIGURINES = "figurines"
    KNICK_KNACKS = "knick_knacks"
    JEWELRY = "jewelry"
    POTTERY = "pottery"
    GLASSWARE = "glassware"
    TEXTILES = "textiles"
    BOOKS = "books"
    COLLECTIBLES = "collectibles"
    VINTAGE_DECOR = "vintage_decor"
    KITCHENWARE = "kitchenware"
    LIGHTING = "lighting"
    MIRRORS = "mirrors"
    CLOCKS = "clocks"
    OTHER = "other"

class Item(Base):
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic info
    name = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="other")
    condition = Column(String(20), nullable=False, default="good")
    
    # Purchase info
    purchase_price = Column(Float, nullable=False)
    purchase_date = Column(DateTime(timezone=True), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    
    # Sale info
    is_sold = Column(Boolean, default=False)
    sale_price = Column(Float, nullable=True)
    sale_date = Column(DateTime(timezone=True), nullable=True)
    
    # Pricing
    suggested_price = Column(Float, nullable=True)  # AI suggested
    listed_price = Column(Float, nullable=True)  # What she lists it for
    
    # AI identification
    ai_identification = Column(Text, nullable=True)  # JSON with AI analysis
    estimated_value_low = Column(Float, nullable=True)
    estimated_value_high = Column(Float, nullable=True)
    
    # Photo (base64 or URL)
    photo = Column(Text, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    store = relationship("Store", backref="items")
    
    @property
    def profit(self):
        if self.is_sold and self.sale_price:
            return self.sale_price - self.purchase_price
        return None
    
    @property
    def profit_margin(self):
        if self.is_sold and self.sale_price and self.purchase_price > 0:
            return ((self.sale_price - self.purchase_price) / self.purchase_price) * 100
        return None
    
    @property
    def days_to_sell(self):
        if self.is_sold and self.sale_date and self.purchase_date:
            return (self.sale_date - self.purchase_date).days
        return None
