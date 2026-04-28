"""
Aplicación principal FastAPI — Red Agroecológica del Tolima.

Registra todos los routers y middleware.
Despliegue: Render.com con uvicorn.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.routers import fincas, muestras
from app.schemas.schemas import HealthRespuesta


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle: arranque y cierre de la aplicación."""
    print("🌱 Red Agroecológica del Tolima — Backend iniciando")
    print(f"   Entorno: {settings.ENV}")
    print(f"   Supabase configurado: {bool(settings.SUPABASE_URL)}")
    print(f"   Cloudinary configurado: {bool(settings.CLOUDINARY_CLOUD_NAME)}")
    yield
    print("👋 Backend cerrando")


app = FastAPI(
    title="Red Agroecológica del Tolima — API",
    description="Sistema de cromatografía visual de suelo con IA",
    version="1.0.0",
    lifespan=lifespan,
)


# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints raíz ──────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "Red Agroecológica del Tolima — API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthRespuesta, tags=["health"])
async def health():
    """Endpoint de salud — usado por Render para verificar que el servicio vive."""
    return HealthRespuesta(
        status="ok",
        service="cromatografia-anillo-organico",
        version="1.0.0",
        env=settings.ENV,
    )


# ── Routers ─────────────────────────────────────────────────
app.include_router(fincas.router)
app.include_router(muestras.router)


# Para arrancar localmente: uvicorn app.main:app --reload
