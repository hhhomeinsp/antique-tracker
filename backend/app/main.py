"""Antique Tracker API - Main Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api import items, stores, analytics, ai_identifier, auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Antique Tracker",
    description="Inventory management for antique & vintage resellers",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - Allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://antique-tracker.onrender.com",
        "https://hardysdecor.com",
        "https://www.hardysdecor.com",
        "https://hardys-interiors.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3333",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(items.router, prefix="/api/items", tags=["Items"])
app.include_router(stores.router, prefix="/api/stores", tags=["Stores"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai_identifier.router, prefix="/api/ai", tags=["AI"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": "Antique Tracker"}
