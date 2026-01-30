# 🏺 Antique Tracker

A mobile-first web app for tracking antique and vintage inventory, with AI-powered item identification and business analytics.

## Features

- **📸 AI Item Identification**: Take a photo and get instant identification, value estimates, and pricing suggestions using OpenAI Vision
- **📦 Inventory Management**: Track purchases, sales, and profit margins
- **🏪 Store Tracking**: Pre-loaded with Brevard County, FL thrift stores
- **📊 Analytics Dashboard**: See best-performing stores, categories, and shopping days
- **📱 Mobile-First PWA**: Installable on your phone, works offline

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + React Query
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **AI**: OpenAI GPT-4 Vision API
- **Hosting**: Render.com

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your OpenAI API key
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deployment to Render

1. Push this repo to GitHub
2. In Render dashboard: New → Blueprint
3. Connect your repo and deploy
4. Set the `OPENAI_API_KEY` environment variable in the backend service

## API Endpoints

- `POST /api/ai/identify` - Identify item from image
- `GET/POST /api/items/` - List/create items
- `POST /api/items/{id}/sell` - Mark item as sold
- `GET /api/stores/` - List stores
- `POST /api/stores/seed-brevard` - Load Brevard County stores
- `GET /api/analytics/summary` - Business summary
- `GET /api/analytics/by-store` - Stats by store
- `GET /api/analytics/by-category` - Stats by category
- `GET /api/analytics/best-shopping-days` - Best days to shop

## License

MIT
