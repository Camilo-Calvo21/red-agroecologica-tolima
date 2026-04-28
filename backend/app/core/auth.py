"""
Middleware de autenticación.
Valida el JWT enviado por el frontend (de Supabase Auth)
y devuelve el user_id del usuario autenticado.
"""
from fastapi import Header, HTTPException, status
from typing import Optional
import httpx
from app.core.config import settings


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Extrae y valida el JWT del header Authorization.
    Devuelve el user_id (sub) del usuario.

    El frontend envía: Authorization: Bearer <token>
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el header Authorization",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de token inválido",
        )

    token = authorization.replace("Bearer ", "").strip()

    # Validar el token usando la API de Supabase
    # (más simple que decodificar JWT manualmente y siempre actualizado)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_ANON_KEY,
                },
                timeout=5.0,
            )

        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
            )

        user_data = resp.json()
        user_id = user_data.get("id")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No se pudo extraer el ID de usuario",
            )

        return user_id

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo verificar el token: {e}",
        )


async def get_current_user_id_optional(
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    """Versión opcional — no falla si no hay token, devuelve None."""
    if not authorization:
        return None
    try:
        return await get_current_user_id(authorization)
    except HTTPException:
        return None
