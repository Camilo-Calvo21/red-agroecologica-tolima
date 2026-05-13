"""
Servicio de almacenamiento de imágenes en Cloudinary.

Versión mejorada con:
- Timeout extendido (60s)
- Reintentos automáticos (2 intentos)
- Logs detallados en cada paso
- Errores específicos (no None genérico)
- Lanza excepciones cuando falla para que el router pueda manejarlas
"""
import httpx
import hashlib
import time
import logging
import asyncio
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class CloudinaryError(Exception):
    """Excepción específica para errores de Cloudinary."""
    pass


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
    max_intentos: int = 2,
) -> dict:
    """
    Sube una imagen a Cloudinary y devuelve la URL pública.

    Args:
        contenido:      bytes de la imagen
        nombre_archivo: nombre del archivo (sin extensión)
        folder:         carpeta en Cloudinary
        max_intentos:   número máximo de intentos en caso de error

    Returns:
        dict con {url, public_id, width, height}

    Raises:
        CloudinaryError: si después de todos los intentos no se pudo subir
    """
    # Validar configuración
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise CloudinaryError("Cloudinary no está configurado (falta CLOUD_NAME)")
    if not settings.CLOUDINARY_API_KEY:
        raise CloudinaryError("Cloudinary no está configurado (falta API_KEY)")
    if not settings.CLOUDINARY_API_SECRET:
        raise CloudinaryError("Cloudinary no está configurado (falta API_SECRET)")

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

    # Tamaño de la imagen en KB para logs
    tamano_kb = len(contenido) / 1024
    logger.info(
        f"🔄 Subiendo a Cloudinary: {nombre_archivo} ({tamano_kb:.1f} KB)"
    )

    ultimo_error = None

    for intento in range(1, max_intentos + 1):
        try:
            logger.info(f"   Intento {intento}/{max_intentos}...")
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(upload_url, data=data, files=files)

                if resp.status_code == 200:
                    datos = resp.json()
                    resultado = {
                        "url": datos.get("secure_url"),
                        "public_id": datos.get("public_id"),
                        "width": datos.get("width"),
                        "height": datos.get("height"),
                    }
                    logger.info(
                        f"✅ Cloudinary OK: {resultado['url']}"
                    )
                    return resultado

                # Status code no fue 200
                error_texto = resp.text[:200] if resp.text else "Sin detalles"
                ultimo_error = (
                    f"Cloudinary respondió {resp.status_code}: {error_texto}"
                )
                logger.warning(f"⚠️  {ultimo_error}")

        except httpx.TimeoutException:
            ultimo_error = "Cloudinary tardó más de 60 segundos en responder"
            logger.warning(f"⏱️  Intento {intento} agotó timeout")

        except httpx.RequestError as e:
            ultimo_error = f"Error de red conectando a Cloudinary: {e}"
            logger.warning(f"🌐 Intento {intento}: {ultimo_error}")

        except Exception as e:
            ultimo_error = f"Error inesperado: {type(e).__name__}: {e}"
            logger.error(f"❌ Intento {intento}: {ultimo_error}")

        # Si no es el último intento, espera 2 segundos antes de reintentar
        if intento < max_intentos:
            logger.info(f"   Esperando 2s antes de reintentar...")
            await asyncio.sleep(2)

    # Si llegamos aquí, todos los intentos fallaron
    raise CloudinaryError(
        f"No se pudo subir a Cloudinary después de {max_intentos} intentos. "
        f"Último error: {ultimo_error}"
    )


async def subir_imagenes_paralelo(
    imagen_original: bytes,
    imagen_procesada: bytes,
    nombre_base: str,
) -> dict:
    """
    Sube las dos imágenes en paralelo para reducir el tiempo total.

    Args:
        imagen_original:  bytes de la imagen original
        imagen_procesada: bytes de la imagen con el anillo
        nombre_base:      base del nombre para ambas imágenes

    Returns:
        dict con {original: {...}, procesada: {...}}

    Raises:
        CloudinaryError: si alguna de las subidas falla
    """
    logger.info("🚀 Iniciando subida en paralelo a Cloudinary")
    tiempo_inicio = time.time()

    try:
        # asyncio.gather ejecuta ambas subidas en paralelo
        info_original, info_procesada = await asyncio.gather(
            subir_imagen(
                contenido=imagen_original,
                nombre_archivo=f"{nombre_base}_original",
            ),
            subir_imagen(
                contenido=imagen_procesada,
                nombre_archivo=f"{nombre_base}_procesada",
            ),
        )

        duracion = time.time() - tiempo_inicio
        logger.info(f"✅ Ambas imágenes subidas en {duracion:.1f}s")

        return {
            "original": info_original,
            "procesada": info_procesada,
        }

    except CloudinaryError:
        # Re-lanza el error específico para que el router lo maneje
        raise

    except Exception as e:
        raise CloudinaryError(
            f"Error inesperado subiendo imágenes en paralelo: {e}"
        )
