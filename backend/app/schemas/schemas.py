"""
Schemas Pydantic — definen la forma de los datos que entran/salen.
Pydantic valida automáticamente y devuelve errores claros si algo no encaja.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ─────────────────────────────────────────────────────────────
# FINCAS
# ─────────────────────────────────────────────────────────────

class FincaCrear(BaseModel):
    """Datos para crear una finca nueva."""
    nombre: str = Field(min_length=2, max_length=120)
    municipio: str = Field(min_length=2, max_length=80)
    vereda: Optional[str] = Field(default=None, max_length=120)
    altitud_msnm: Optional[int] = Field(default=None, ge=0, le=6000)
    cultivo_principal: Optional[str] = Field(default=None, max_length=80)
    notas: Optional[str] = Field(default=None, max_length=500)


class FincaRespuesta(BaseModel):
    """Lo que devuelve la API al consultar una finca."""
    id: UUID
    nombre: str
    municipio: str
    vereda: Optional[str]
    altitud_msnm: Optional[int]
    cultivo_principal: Optional[str]
    notas: Optional[str]
    creada_en: datetime
    total_muestras: int = 0


# ─────────────────────────────────────────────────────────────
# MUESTRAS
# ─────────────────────────────────────────────────────────────

class MuestraCrear(BaseModel):
    """Datos para crear una muestra (la imagen va aparte como upload)."""
    finca_id: UUID
    ph: float = Field(ge=0, le=14)
    humedad: float = Field(ge=0, le=100)
    fecha_muestra: Optional[datetime] = None
    notas: Optional[str] = Field(default=None, max_length=500)

    @field_validator("ph")
    @classmethod
    def ph_redondeado(cls, v):
        return round(v, 2)

    @field_validator("humedad")
    @classmethod
    def humedad_redondeada(cls, v):
        return round(v, 1)


class MuestraRespuesta(BaseModel):
    """Lo que devuelve la API al consultar una muestra."""
    id: UUID
    finca_id: UUID
    ph: float
    humedad: float
    estado_ph: str
    estado_humedad: str
    direccion_borde: str
    imagen_original_url: Optional[str]
    imagen_procesada_url: Optional[str]
    fecha_muestra: datetime
    notas: Optional[str]
    creada_en: datetime


class MuestraResumen(BaseModel):
    """Versión reducida para listados."""
    id: UUID
    finca_nombre: str
    ph: float
    humedad: float
    estado_ph: str
    imagen_procesada_url: Optional[str]
    fecha_muestra: datetime


# ─────────────────────────────────────────────────────────────
# RESPUESTAS GENÉRICAS
# ─────────────────────────────────────────────────────────────

class HealthRespuesta(BaseModel):
    status: str
    service: str
    version: str
    env: str


class ErrorRespuesta(BaseModel):
    error: str
    detalle: Optional[str] = None
