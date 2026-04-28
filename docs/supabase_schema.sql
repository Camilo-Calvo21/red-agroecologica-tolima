-- ═══════════════════════════════════════════════════════════════
-- Red Agroecológica del Tolima — Schema de base de datos
-- ═══════════════════════════════════════════════════════════════
-- Ejecutar este script en Supabase: SQL Editor → New Query
-- Crea las tablas, índices, políticas de seguridad (RLS) y triggers.
-- ═══════════════════════════════════════════════════════════════

-- Habilitar extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────
-- TABLA: fincas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fincas (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre              TEXT        NOT NULL,
    municipio           TEXT        NOT NULL,
    vereda              TEXT,
    altitud_msnm        INTEGER     CHECK (altitud_msnm >= 0 AND altitud_msnm <= 6000),
    cultivo_principal   TEXT,
    notas               TEXT,
    creada_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizada_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fincas_usuario  ON public.fincas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fincas_creadas  ON public.fincas(creada_en DESC);


-- ─────────────────────────────────────────────────────────────
-- TABLA: muestras
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.muestras (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    finca_id                UUID        NOT NULL REFERENCES public.fincas(id) ON DELETE CASCADE,
    usuario_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Parámetros medidos
    ph                      NUMERIC(4,2) NOT NULL CHECK (ph >= 0 AND ph <= 14),
    humedad                 NUMERIC(5,2) NOT NULL CHECK (humedad >= 0 AND humedad <= 100),

    -- Estados derivados (cacheados para listados rápidos)
    estado_ph               TEXT        NOT NULL,
    estado_humedad          TEXT        NOT NULL,
    direccion_borde         TEXT        NOT NULL,
    amplitud_px             INTEGER     NOT NULL DEFAULT 0,

    -- Imágenes en Cloudinary
    imagen_original_url     TEXT,
    imagen_procesada_url    TEXT,

    -- Metadatos
    fecha_muestra           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notas                   TEXT,
    creada_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizada_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muestras_finca       ON public.muestras(finca_id);
CREATE INDEX IF NOT EXISTS idx_muestras_usuario     ON public.muestras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_muestras_fecha       ON public.muestras(fecha_muestra DESC);


-- ─────────────────────────────────────────────────────────────
-- TRIGGERS: actualizar 'actualizada_en' automáticamente
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_actualizada_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizada_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fincas_updated   ON public.fincas;
CREATE TRIGGER trg_fincas_updated
    BEFORE UPDATE ON public.fincas
    FOR EACH ROW EXECUTE FUNCTION public.set_actualizada_en();

DROP TRIGGER IF EXISTS trg_muestras_updated ON public.muestras;
CREATE TRIGGER trg_muestras_updated
    BEFORE UPDATE ON public.muestras
    FOR EACH ROW EXECUTE FUNCTION public.set_actualizada_en();


-- ═══════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════
-- Cada usuario solo ve y modifica sus propios datos.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.fincas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muestras  ENABLE ROW LEVEL SECURITY;


-- ── Políticas para fincas ──────────────────────────────────
DROP POLICY IF EXISTS "Usuarios ven sus fincas"     ON public.fincas;
CREATE POLICY "Usuarios ven sus fincas"
    ON public.fincas FOR SELECT
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios crean sus fincas"   ON public.fincas;
CREATE POLICY "Usuarios crean sus fincas"
    ON public.fincas FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios editan sus fincas"  ON public.fincas;
CREATE POLICY "Usuarios editan sus fincas"
    ON public.fincas FOR UPDATE
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios borran sus fincas"  ON public.fincas;
CREATE POLICY "Usuarios borran sus fincas"
    ON public.fincas FOR DELETE
    USING (auth.uid() = usuario_id);


-- ── Políticas para muestras ────────────────────────────────
DROP POLICY IF EXISTS "Usuarios ven sus muestras"    ON public.muestras;
CREATE POLICY "Usuarios ven sus muestras"
    ON public.muestras FOR SELECT
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios crean sus muestras"  ON public.muestras;
CREATE POLICY "Usuarios crean sus muestras"
    ON public.muestras FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios editan sus muestras" ON public.muestras;
CREATE POLICY "Usuarios editan sus muestras"
    ON public.muestras FOR UPDATE
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios borran sus muestras" ON public.muestras;
CREATE POLICY "Usuarios borran sus muestras"
    ON public.muestras FOR DELETE
    USING (auth.uid() = usuario_id);


-- ═══════════════════════════════════════════════════════════════
-- LISTO. Confirma la creación con:
--   SELECT * FROM public.fincas LIMIT 1;
--   SELECT * FROM public.muestras LIMIT 1;
-- ═══════════════════════════════════════════════════════════════
