"""
Endpoints de fincas — CRUD básico.
Todos los endpoints requieren autenticación: solo el dueño de la finca
ve y modifica sus fincas.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID
from app.core.auth import get_current_user_id
from app.core.database import get_supabase
from app.schemas.schemas import FincaCrear, FincaRespuesta

router = APIRouter(prefix="/api/fincas", tags=["fincas"])


@router.get("", response_model=List[FincaRespuesta])
async def listar_fincas(user_id: str = Depends(get_current_user_id)):
    """Devuelve todas las fincas del usuario actual."""
    sb = get_supabase()

    # Consultar fincas con conteo de muestras
    resp = (
        sb.table("fincas")
        .select("*, muestras(count)")
        .eq("usuario_id", user_id)
        .order("creada_en", desc=True)
        .execute()
    )

    fincas = []
    for f in resp.data:
        total = f.get("muestras", [{"count": 0}])[0]["count"] if f.get("muestras") else 0
        fincas.append(FincaRespuesta(
            id=f["id"],
            nombre=f["nombre"],
            municipio=f["municipio"],
            vereda=f.get("vereda"),
            altitud_msnm=f.get("altitud_msnm"),
            cultivo_principal=f.get("cultivo_principal"),
            notas=f.get("notas"),
            creada_en=f["creada_en"],
            total_muestras=total,
        ))
    return fincas


@router.post("", response_model=FincaRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_finca(
    datos: FincaCrear,
    user_id: str = Depends(get_current_user_id),
):
    """Crea una nueva finca para el usuario actual."""
    sb = get_supabase()

    nuevo = {
        "usuario_id": user_id,
        "nombre": datos.nombre,
        "municipio": datos.municipio,
        "vereda": datos.vereda,
        "altitud_msnm": datos.altitud_msnm,
        "cultivo_principal": datos.cultivo_principal,
        "notas": datos.notas,
    }

    resp = sb.table("fincas").insert(nuevo).execute()
    finca = resp.data[0]

    return FincaRespuesta(
        id=finca["id"],
        nombre=finca["nombre"],
        municipio=finca["municipio"],
        vereda=finca.get("vereda"),
        altitud_msnm=finca.get("altitud_msnm"),
        cultivo_principal=finca.get("cultivo_principal"),
        notas=finca.get("notas"),
        creada_en=finca["creada_en"],
        total_muestras=0,
    )


@router.get("/{finca_id}", response_model=FincaRespuesta)
async def obtener_finca(
    finca_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    """Detalle de una finca específica."""
    sb = get_supabase()

    resp = (
        sb.table("fincas")
        .select("*, muestras(count)")
        .eq("id", str(finca_id))
        .eq("usuario_id", user_id)
        .single()
        .execute()
    )

    if not resp.data:
        raise HTTPException(404, "Finca no encontrada")

    f = resp.data
    total = f.get("muestras", [{"count": 0}])[0]["count"] if f.get("muestras") else 0
    return FincaRespuesta(
        id=f["id"],
        nombre=f["nombre"],
        municipio=f["municipio"],
        vereda=f.get("vereda"),
        altitud_msnm=f.get("altitud_msnm"),
        cultivo_principal=f.get("cultivo_principal"),
        notas=f.get("notas"),
        creada_en=f["creada_en"],
        total_muestras=total,
    )


@router.delete("/{finca_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_finca(
    finca_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    """Elimina una finca y todas sus muestras (cascade)."""
    sb = get_supabase()

    sb.table("fincas").delete().eq("id", str(finca_id)).eq("usuario_id", user_id).execute()
    return None
