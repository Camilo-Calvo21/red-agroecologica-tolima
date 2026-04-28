"""
Endpoints de muestras — el corazón funcional del sistema.

Flujo principal:
  1. Usuario sube imagen + pH + humedad + finca_id
  2. Backend genera el anillo orgánico
  3. Sube imagen original y procesada a Cloudinary
  4. Guarda registro en Supabase con metadatos
  5. Devuelve la muestra completa al frontend
"""
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
from app.services.cloudinary_service import subir_imagen

router = APIRouter(prefix="/api/muestras", tags=["muestras"])


# ─────────────────────────────────────────────────────────────
# CREAR MUESTRA (upload + procesamiento + persistencia)
# ─────────────────────────────────────────────────────────────

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
    """
    # Validar tipo de imagen
    if not imagen.content_type or not imagen.content_type.startswith("image/"):
        raise HTTPException(400, "El archivo debe ser una imagen")

    # Validar que la finca pertenezca al usuario
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
        raise HTTPException(404, "Finca no encontrada o no te pertenece")

    # Leer bytes de la imagen
    imagen_bytes = await imagen.read()
    if len(imagen_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "La imagen no puede pesar más de 10 MB")

    # Generar anillo
    try:
        imagen_procesada, metadata = generar_anillo(
            imagen_bytes=imagen_bytes,
            ph=ph,
            humedad=humedad,
        )
    except Exception as e:
        raise HTTPException(500, f"Error procesando imagen: {e}")

    # Convertir imagen procesada a bytes
    buffer = BytesIO()
    imagen_procesada.save(buffer, format="PNG", optimize=True)
    procesada_bytes = buffer.getvalue()

    # Subir ambas imágenes a Cloudinary
    nombre_base = f"muestra_{finca_id}_{int(datetime.now().timestamp())}"

    info_original = await subir_imagen(
        contenido=imagen_bytes,
        nombre_archivo=f"{nombre_base}_original",
    )
    info_procesada = await subir_imagen(
        contenido=procesada_bytes,
        nombre_archivo=f"{nombre_base}_procesada",
    )

    # Crear registro en Supabase
    nueva = {
        "finca_id": str(finca_id),
        "usuario_id": user_id,
        "ph": metadata["ph"],
        "humedad": metadata["humedad"],
        "estado_ph": metadata["estado_ph"],
        "estado_humedad": metadata["estado_humedad"],
        "direccion_borde": metadata["direccion_borde"],
        "amplitud_px": metadata["amplitud_px"],
        "imagen_original_url": info_original.get("url") if info_original else None,
        "imagen_procesada_url": info_procesada.get("url") if info_procesada else None,
        "fecha_muestra": datetime.now().isoformat(),
        "notas": notas,
    }

    resp = sb.table("muestras").insert(nueva).execute()
    muestra = resp.data[0]

    return _muestra_a_respuesta(muestra)


# ─────────────────────────────────────────────────────────────
# LISTAR / OBTENER / ELIMINAR
# ─────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

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
