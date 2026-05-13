"""
Endpoints de muestras — el corazón funcional del sistema.

Versión mejorada con:
- Validación robusta de Cloudinary
- Subida en paralelo (reduce tiempo total)
- Logs detallados en cada paso
- Errores específicos al frontend
- Manejo de fallos parciales

Flujo principal:
  1. Usuario sube imagen + pH + humedad + finca_id
  2. Backend genera el anillo orgánico
  3. Sube ambas imágenes en paralelo a Cloudinary
  4. Si Cloudinary falla, retorna error claro al frontend
  5. Solo si todo OK, guarda registro en Supabase
  6. Devuelve la muestra completa al frontend
"""
import logging
import time
from fastapi import (
    APIRouter, Depends, UploadFile, File, Form,
    HTTPException, status, Query,
)
from typing import List, Optional
from uuid import UUID
from io import BytesIO
from datetime import datetime

from app.core.auth import get_current_user_id
from app.core.database import get_supabase
from app.schemas.schemas import MuestraRespuesta, MuestraResumen
from app.services.anillo_organico import generar_anillo
from app.services.cloudinary_service import (
    subir_imagenes_paralelo,
    CloudinaryError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/muestras", tags=["muestras"])


# ─────────────────────────────────────────────────────────────────────
# CREAR MUESTRA (upload + procesamiento + persistencia)
# ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=MuestraRespuesta,
             status_code=status.HTTP_201_CREATED)
async def crear_muestra(
    finca_id: UUID = Form(...),
    ph: float = Form(..., ge=0, le=14),
    humedad: float = Form(..., ge=0, le=100),
    notas: Optional[str] = Form(None),
    imagen: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Procesa una nueva muestra de cromatografía.

    Pasos:
      1. Validar imagen
      2. Validar finca
      3. Generar anillo paramétrico
      4. Subir imágenes a Cloudinary (en paralelo)
      5. Guardar registro en Supabase
      6. Devolver al frontend
    """
    tiempo_inicio = time.time()
    logger.info("=" * 60)
    logger.info(f"📥 Nueva muestra para finca {finca_id}")
    logger.info(f"   pH: {ph} | Humedad: {humedad}%")

    # ─── PASO 1: Validar tipo de imagen ────────────────────────────
    if not imagen.content_type or not imagen.content_type.startswith("image/"):
        logger.warning(f"❌ Archivo no es imagen: {imagen.content_type}")
        raise HTTPException(400, "El archivo debe ser una imagen")

    # ─── PASO 2: Validar finca ──────────────────────────────────────
    sb = get_supabase()
    finca_resp = (
        sb.table("fincas")
        .select("id, nombre")
        .eq("id", str(finca_id))
        .eq("usuario_id", user_id)
        .single()
        .execute()
    )
    if not finca_resp.data:
        logger.warning(f"❌ Finca {finca_id} no encontrada para usuario {user_id}")
        raise HTTPException(404, "Finca no encontrada o no te pertenece")

    logger.info(f"   Finca: {finca_resp.data['nombre']}")

    # ─── PASO 3: Leer bytes de la imagen ───────────────────────────
    imagen_bytes = await imagen.read()
    tamano_mb = len(imagen_bytes) / (1024 * 1024)
    logger.info(f"   Imagen recibida: {tamano_mb:.2f} MB")

    if len(imagen_bytes) > 10 * 1024 * 1024:
        logger.warning(f"❌ Imagen demasiado grande: {tamano_mb:.2f} MB")
        raise HTTPException(400, "La imagen no puede pesar más de 10 MB")

    if len(imagen_bytes) < 1024:
        logger.warning(f"❌ Imagen demasiado pequeña: {len(imagen_bytes)} bytes")
        raise HTTPException(400, "La imagen parece estar corrupta o vacía")

    # ─── PASO 4: Generar anillo paramétrico ────────────────────────
    logger.info("🎨 Generando anillo paramétrico...")
    paso_inicio = time.time()
    try:
        imagen_procesada, metadata = generar_anillo(
            imagen_bytes=imagen_bytes,
            ph=ph,
            humedad=humedad,
        )
        duracion = time.time() - paso_inicio
        logger.info(f"   ✅ Anillo generado en {duracion:.1f}s")
    except Exception as e:
        logger.error(f"❌ Error generando anillo: {type(e).__name__}: {e}")
        raise HTTPException(
            500,
            f"Error procesando la imagen del cromatograma: {str(e)[:100]}"
        )

    # ─── PASO 5: Convertir imagen procesada a bytes ────────────────
    buffer = BytesIO()
    imagen_procesada.save(buffer, format="PNG", optimize=True)
    procesada_bytes = buffer.getvalue()
    logger.info(f"   Imagen procesada: {len(procesada_bytes) / 1024:.1f} KB")

    # ─── PASO 6: Subir ambas imágenes a Cloudinary (paralelo) ──────
    nombre_base = f"muestra_{finca_id}_{int(datetime.now().timestamp())}"

    try:
        resultado_subida = await subir_imagenes_paralelo(
            imagen_original=imagen_bytes,
            imagen_procesada=procesada_bytes,
            nombre_base=nombre_base,
        )
        info_original = resultado_subida["original"]
        info_procesada = resultado_subida["procesada"]

    except CloudinaryError as e:
        # Cloudinary falló — NO guardamos en BD para mantener consistencia
        logger.error(f"❌ Cloudinary falló: {e}")
        raise HTTPException(
            status_code=503,
            detail=(
                f"No se pudo guardar la imagen en la nube. "
                f"Por favor inténtalo de nuevo en unos segundos. "
                f"Detalle técnico: {str(e)[:150]}"
            )
        )

    # ─── PASO 7: Validar que las URLs sean válidas ─────────────────
    if not info_original.get("url") or not info_procesada.get("url"):
        logger.error("❌ Cloudinary devolvió URLs vacías")
        raise HTTPException(
            status_code=503,
            detail="La nube respondió pero sin URLs válidas. Intenta de nuevo."
        )

    # ─── PASO 8: Guardar registro en Supabase ──────────────────────
    logger.info("💾 Guardando en base de datos...")
    nueva = {
        "finca_id": str(finca_id),
        "usuario_id": user_id,
        "ph": metadata["ph"],
        "humedad": metadata["humedad"],
        "estado_ph": metadata["estado_ph"],
        "estado_humedad": metadata["estado_humedad"],
        "direccion_borde": metadata["direccion_borde"],
        "amplitud_px": metadata["amplitud_px"],
        "imagen_original_url": info_original["url"],
        "imagen_procesada_url": info_procesada["url"],
        "fecha_muestra": datetime.now().isoformat(),
        "notas": notas,
    }

    try:
        resp = sb.table("muestras").insert(nueva).execute()
        muestra = resp.data[0]
    except Exception as e:
        logger.error(f"❌ Error guardando en BD: {e}")
        raise HTTPException(
            500,
            "Las imágenes se subieron pero no se pudieron guardar en la base "
            "de datos. Las imágenes quedaron en Cloudinary pero la muestra no."
        )

    duracion_total = time.time() - tiempo_inicio
    logger.info(f"✅ Muestra creada exitosamente en {duracion_total:.1f}s")
    logger.info("=" * 60)

    return _muestra_a_respuesta(muestra)


# ─────────────────────────────────────────────────────────────────────
# LISTAR / OBTENER / ELIMINAR
# ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[MuestraResumen])
async def listar_muestras(
    finca_id: Optional[UUID] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
):
    """Listado de muestras del usuario, opcionalmente filtradas por finca."""
    sb = get_supabase()

    query = (
        sb.table("muestras")
        .select("*, fincas(nombre)")
        .eq("usuario_id", user_id)
        .order("fecha_muestra", desc=True)
        .limit(limit)
    )
    if finca_id:
        query = query.eq("finca_id", str(finca_id))

    resp = query.execute()

    return [
        MuestraResumen(
            id=m["id"],
            finca_nombre=m["fincas"]["nombre"] if m.get("fincas") else "Sin finca",
            ph=m["ph"],
            humedad=m["humedad"],
            estado_ph=m["estado_ph"],
            imagen_procesada_url=m.get("imagen_procesada_url"),
            fecha_muestra=m["fecha_muestra"],
        )
        for m in resp.data
    ]


@router.get("/{muestra_id}", response_model=MuestraRespuesta)
async def obtener_muestra(
    muestra_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    """Detalle de una muestra específica."""
    sb = get_supabase()
    resp = (
        sb.table("muestras")
        .select("*")
        .eq("id", str(muestra_id))
        .eq("usuario_id", user_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Muestra no encontrada")
    return _muestra_a_respuesta(resp.data)


@router.delete("/{muestra_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_muestra(
    muestra_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    """Elimina una muestra. Las imágenes en Cloudinary quedan huérfanas
       (se pueden limpiar con un cron job posterior)."""
    sb = get_supabase()
    sb.table("muestras").delete().eq("id", str(muestra_id)).eq(
        "usuario_id", user_id
    ).execute()
    return None


# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

def _muestra_a_respuesta(m: dict) -> MuestraRespuesta:
    return MuestraRespuesta(
        id=m["id"],
        finca_id=m["finca_id"],
        ph=m["ph"],
        humedad=m["humedad"],
        estado_ph=m["estado_ph"],
        estado_humedad=m["estado_humedad"],
        direccion_borde=m["direccion_borde"],
        imagen_original_url=m.get("imagen_original_url"),
        imagen_procesada_url=m.get("imagen_procesada_url"),
        fecha_muestra=m["fecha_muestra"],
        notas=m.get("notas"),
        creada_en=m["creada_en"],
    )
