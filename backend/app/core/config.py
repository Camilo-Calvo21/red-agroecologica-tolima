"""
Configuración central del backend.
Lee variables de entorno y las expone tipadas mediante pydantic-settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Variables de entorno tipadas con valores por defecto seguros."""

    # ── Entorno ─────────────────────────────────────────────
    ENV: str = "development"
    DEBUG: bool = False

    # ── Base de datos / Supabase ────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # ── JWT (para validar tokens de Supabase Auth) ──────────
    SUPABASE_JWT_SECRET: str = ""

    # ── Cloudinary (almacenamiento de imágenes) ─────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ── CORS ────────────────────────────────────────────────
    # En producción debe incluir el dominio de Vercel
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── Configuración del modelo ────────────────────────────
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Instancia única reutilizable
settings = Settings()
