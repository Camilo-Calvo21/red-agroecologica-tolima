"""
Cliente Supabase para acceder a la base de datos y autenticación.

Se inicializa una vez al arrancar la aplicación y se reutiliza
en toda la app a través de inyección de dependencias.
"""
from supabase import create_client, Client
from app.core.config import settings


def get_supabase() -> Client:
    """
    Cliente con la service_key (para operaciones privilegiadas del backend).
    Úsalo en endpoints que ya validaron al usuario por su lado.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en las variables "
            "de entorno. Configúralas en .env (local) o en Render (producción)."
        )

    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY,
    )


def get_supabase_anon() -> Client:
    """Cliente con la anon_key (para validar tokens del usuario)."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )
