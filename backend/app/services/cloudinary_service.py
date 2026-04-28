"""
Servicio de almacenamiento de imágenes en Cloudinary.

Cloudinary tiene un tier gratis muy generoso (25 GB de storage, 25 GB de
bandwidth mensual) — perfecto para este proyecto.

Se usa la API REST directamente con httpx en lugar del SDK oficial,
para mantener las dependencias mínimas en Render.
"""
import httpx
import hashlib
import time
from typing import Optional
from app.core.config import settings


def _firma_cloudinary(params: dict) -> str:
    """
    Genera la firma SHA-1 que Cloudinary requiere para uploads autenticados.
    Formato: SHA1(params_ordenados + api_secret)
    """
    items = sorted(params.items())
    cadena = "&".join(f"{k}={v}" for k, v in items)
    cadena += settings.CLOUDINARY_API_SECRET
    return hashlib.sha1(cadena.encode()).hexdigest()


async def subir_imagen(
    contenido: bytes,
    nombre_archivo: str,
    folder: str = "cromatografias",
) -> Optional[dict]:
    """
    Sube una imagen a Cloudinary y devuelve la URL pública.

    Args:
        contenido:      bytes de la imagen
        nombre_archivo: nombre del archivo (sin extensión)
        folder:         carpeta en Cloudinary

    Returns:
        dict con {url, public_id, width, height} o None si falla
    """
    if not settings.CLOUDINARY_CLOUD_NAME:
        return None  # Cloudinary no está configurado

    timestamp = int(time.time())
    public_id = f"{folder}/{nombre_archivo}_{timestamp}"

    # Parámetros que se firman
    params_firma = {
        "public_id": public_id,
        "timestamp": timestamp,
    }
    firma = _firma_cloudinary(params_firma)

    upload_url = (
        f"https://api.cloudinary.com/v1_1/"
        f"{settings.CLOUDINARY_CLOUD_NAME}/image/upload"
    )

    files = {"file": (nombre_archivo, contenido, "image/png")}
    data = {
        "public_id": public_id,
        "timestamp": str(timestamp),
        "api_key": settings.CLOUDINARY_API_KEY,
        "signature": firma,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(upload_url, data=data, files=files)
            resp.raise_for_status()
            datos = resp.json()
            return {
                "url": datos.get("secure_url"),
                "public_id": datos.get("public_id"),
                "width": datos.get("width"),
                "height": datos.get("height"),
            }
    except Exception as e:
        print(f"Error subiendo a Cloudinary: {e}")
        return None
