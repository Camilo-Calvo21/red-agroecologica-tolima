"""
Generador de anillo paramétrico orgánico.

Versión portada al backend del algoritmo desarrollado en el notebook
de Colab (celda 4 — terrain-like aperiódico). Este código reproduce
exactamente el comportamiento visual que ya validamos en producción.

API pública:
    generar_anillo(image, ph, humedad, agregar_leyenda=True) -> Image
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import numpy as np
import hashlib
from typing import Tuple, Dict, Optional

# ─────────────────────────────────────────────────────────────
# CONFIGURACIÓN POR DEFECTO — ajustable mediante parámetro
# ─────────────────────────────────────────────────────────────

CONFIG_DEFECTO: Dict = {
    "cx": 512,
    "cy": 512,
    "r_interno": 415,
    "r_externo": 488,
    "num_crestas": 36,
    "altura_max_px": 60,
}


# ─────────────────────────────────────────────────────────────
# RUIDO ORGÁNICO DETERMINISTA
# ─────────────────────────────────────────────────────────────

def _ruido_organico(x: float, y: float, escala: float = 40.0,
                    semilla: int = 42) -> float:
    """Ruido 2D estilo Perlin — 3 frecuencias sumadas, normalizado a [-1, 1]."""
    sx = x / escala
    sy = y / escala
    n = (
        np.sin(sx * 1.1 + semilla * 0.13) *
        np.cos(sy * 0.9 + semilla * 0.17)
        + np.sin(sx * 2.3 + sy * 1.7 + semilla * 0.29) * 0.5
        + np.cos(sx * 4.1 - sy * 3.3 + semilla * 0.41) * 0.25
    )
    return n / 1.75


# ─────────────────────────────────────────────────────────────
# PERFIL TERRAIN APERIÓDICO
# ─────────────────────────────────────────────────────────────

def _generar_perfil_terrain(num_puntos: int, altura_max: float,
                              semilla: int) -> np.ndarray:
    """
    Genera un perfil aperiódico de altura usando 5 octavas de ruido
    con frecuencias irracionales — sin sawtooth, sin periodicidad.
    """
    rng = np.random.RandomState(semilla)
    phi = 1.6180339887

    base_frecs = np.array([
        1.0 + rng.uniform(-0.2, 0.2),
        2.0 * phi + rng.uniform(-0.3, 0.3),
        4.0 * np.pi / 3 + rng.uniform(-0.5, 0.5),
        7.0 * phi + rng.uniform(-0.5, 0.5),
        13.0 + rng.uniform(-1.0, 1.0),
    ])
    amplitudes = np.array([1.0, 0.55, 0.32, 0.18, 0.10])
    fases = rng.uniform(0, 2 * np.pi, size=len(base_frecs))

    theta = np.linspace(0, 2 * np.pi, num_puntos, endpoint=False)
    perfil = np.zeros(num_puntos, dtype=np.float32)
    for amp, frec, fase in zip(amplitudes, base_frecs, fases):
        perfil += amp * np.sin(theta * frec + fase)

    perfil = perfil - perfil.min()
    perfil = perfil / max(perfil.max(), 1e-6)
    perfil = np.power(perfil, 1.4)

    # Modulación de amplitud local
    mod = np.zeros(num_puntos, dtype=np.float32)
    for k in range(3):
        f = 0.5 + k * 1.3
        p = rng.uniform(0, 2 * np.pi)
        mod += np.sin(theta * f + p) / (k + 1)
    mod = (mod - mod.min()) / max(mod.max() - mod.min(), 1e-6)
    mod = 0.35 + 0.65 * mod

    perfil = perfil * mod
    return perfil * altura_max


# ─────────────────────────────────────────────────────────────
# MUESTREO DE PALETTE LOCAL
# ─────────────────────────────────────────────────────────────

def _muestrear_palette_local(imagen_base: Image.Image, config: dict,
                              n_muestras: int = 720) -> np.ndarray:
    """Captura el color real del borde del cromatograma."""
    arr = np.array(imagen_base.convert("RGB"))
    cx, cy = config["cx"], config["cy"]
    r_muestra = (config["r_interno"] + config["r_externo"]) / 2

    angulos = np.linspace(0, 2 * np.pi, n_muestras, endpoint=False)
    palette = np.zeros((n_muestras, 3), dtype=np.float32)

    for i, ang in enumerate(angulos):
        acc = np.zeros(3, dtype=np.float32)
        cnt = 0
        for dr in (-8, -4, 0, 4, 8):
            r = r_muestra + dr
            x = int(cx + r * np.cos(ang))
            y = int(cy + r * np.sin(ang))
            if 0 <= y < arr.shape[0] and 0 <= x < arr.shape[1]:
                acc += arr[y, x].astype(np.float32)
                cnt += 1
        palette[i] = acc / max(cnt, 1)

    return palette


# ─────────────────────────────────────────────────────────────
# MAPEO DE PARÁMETROS
# ─────────────────────────────────────────────────────────────

def _color_por_humedad(humedad: float) -> Tuple[int, int, int]:
    """Rampa azul de 5 puntos según humedad."""
    h = max(0.0, min(100.0, humedad))
    t = h / 100.0
    puntos = [
        (0.00, (214, 238, 255)),
        (0.25, (135, 206, 235)),
        (0.50, ( 42, 130, 200)),
        (0.75, ( 26,  95, 160)),
        (1.00, ( 10,  30,  90)),
    ]
    for i in range(len(puntos) - 1):
        t0, c0 = puntos[i]
        t1, c1 = puntos[i + 1]
        if t0 <= t <= t1:
            f = (t - t0) / (t1 - t0)
            return (
                int(c0[0] + f * (c1[0] - c0[0])),
                int(c0[1] + f * (c1[1] - c0[1])),
                int(c0[2] + f * (c1[2] - c0[2])),
            )
    return puntos[-1][1]


def _parametros_crestas(ph: float, config: dict) -> Dict:
    """pH < 7 → adentro, pH > 7 → afuera, pH = 7 → liso."""
    ph = max(0.0, min(14.0, float(ph)))
    altura_max = config["altura_max_px"]
    if ph == 7.0:
        return {"direccion": "ninguna", "altura_px": 0, "altura_pct": 0.0}
    if ph < 7.0:
        pct = (7.0 - ph) / 6.0
        return {"direccion": "adentro",
                "altura_px": int(pct * altura_max),
                "altura_pct": pct * 100}
    pct = (ph - 7.0) / 7.0
    return {"direccion": "afuera",
            "altura_px": int(pct * altura_max),
            "altura_pct": pct * 100}


def _color_mezclado(color_base, color_local, ruido, mezcla=0.52):
    """Mezcla azul base con tono del papel + micro-variación orgánica."""
    r = color_base[0] * (1 - mezcla) + color_local[0] * mezcla
    g = color_base[1] * (1 - mezcla) + color_local[1] * mezcla
    b = color_base[2] * (1 - mezcla) + color_local[2] * mezcla
    r += ruido * 12
    g += ruido * 10
    b += ruido * 8
    shift = ruido * 6
    r += shift
    b -= shift
    return (
        int(max(0, min(255, r))),
        int(max(0, min(255, g))),
        int(max(0, min(255, b))),
    )


def _estado_ph(ph: float) -> str:
    tabla = [(5.0, "Muy ácido"), (5.8, "Ácido"), (6.5, "Lig. ácido"),
             (7.2, "Neutro (óptimo)"), (8.0, "Lig. alcalino"),
             (9.0, "Alcalino")]
    for lim, est in tabla:
        if ph < lim:
            return est
    return "Muy alcalino"


def _estado_humedad(h: float) -> str:
    tabla = [(20, "Extremadamente seco"), (35, "Seco"), (50, "Moderado"),
             (70, "Óptimo"), (85, "Húmedo")]
    for lim, est in tabla:
        if h < lim:
            return est
    return "Saturado"


# ─────────────────────────────────────────────────────────────
# RENDERIZADO PIXEL-A-PIXEL DEL ANILLO
# ─────────────────────────────────────────────────────────────

def _dibujar_anillo_organico(capa, color_base, palette, config, semilla):
    """Corona base con muestreo de palette local + ruido orgánico."""
    cx, cy = config["cx"], config["cy"]
    r_int = config["r_interno"]
    r_ext = config["r_externo"]
    ancho = r_ext - r_int

    arr = np.array(capa)
    H, W = arr.shape[:2]

    y_min = max(0, cy - r_ext - 80)
    y_max = min(H, cy + r_ext + 80)
    x_min = max(0, cx - r_ext - 80)
    x_max = min(W, cx + r_ext + 80)

    n_pal = len(palette)

    for py in range(y_min, y_max):
        dy = py - cy
        for px in range(x_min, x_max):
            dx = px - cx
            dist = np.sqrt(dx * dx + dy * dy)

            ruido_grosor = _ruido_organico(px, py, 120.0, semilla)
            r_int_var = r_int + ruido_grosor * 3
            r_ext_var = r_ext + ruido_grosor * 4

            if dist < r_int_var - 2 or dist > r_ext_var + 2:
                continue

            angulo = np.arctan2(dy, dx)
            if angulo < 0:
                angulo += 2 * np.pi
            idx = int(angulo / (2 * np.pi) * n_pal) % n_pal
            color_local = palette[idx]

            ruido_color = _ruido_organico(px, py, 15.0, semilla)
            color = _color_mezclado(color_base, color_local, ruido_color)

            t = (dist - r_int_var) / max(ancho, 1)
            t = max(0.0, min(1.0, t))
            if t < 0.4:
                alpha_base = t / 0.4
            else:
                alpha_base = 1 - (t - 0.4) / 0.6
            alpha_base = max(0.0, alpha_base) ** 0.8

            if dist < r_int_var:
                alpha_base *= 1.0 - (r_int_var - dist) / 3.0
            elif dist > r_ext_var:
                alpha_base *= 1.0 - (dist - r_ext_var) / 3.0

            ruido_alpha = _ruido_organico(px, py, 25.0, semilla + 100)
            alpha_mod = alpha_base * (0.85 + ruido_alpha * 0.15)

            alpha = int(max(0, min(170, alpha_mod * 175)))
            if alpha < 8:
                continue

            arr[py, px, 0] = color[0]
            arr[py, px, 1] = color[1]
            arr[py, px, 2] = color[2]
            arr[py, px, 3] = max(arr[py, px, 3], alpha)

    return Image.fromarray(arr, "RGBA")


def _dibujar_borde_terrain(capa, color_base, palette, ph, config, semilla):
    """Borde aperiódico terrain-like — sin sawtooth, sin periodicidad."""
    params = _parametros_crestas(ph, config)
    if params["altura_px"] == 0:
        return capa

    cx, cy = config["cx"], config["cy"]
    r_int = config["r_interno"]
    r_ext = config["r_externo"]
    altura_max = params["altura_px"]
    direccion = params["direccion"]
    n_pal = len(palette)

    NUM_PUNTOS = 720
    perfil = _generar_perfil_terrain(
        NUM_PUNTOS, altura_max,
        semilla + (13 if direccion == "adentro" else 29),
    )

    arr = np.array(capa)
    H, W = arr.shape[:2]

    margen = altura_max + 8
    y_min = max(0, cy - r_ext - margen)
    y_max = min(H, cy + r_ext + margen)
    x_min = max(0, cx - r_ext - margen)
    x_max = min(W, cx + r_ext + margen)

    for py in range(y_min, y_max):
        dy = py - cy
        for px in range(x_min, x_max):
            dx = px - cx
            dist = np.sqrt(dx * dx + dy * dy)

            angulo = np.arctan2(dy, dx)
            if angulo < 0:
                angulo += 2 * np.pi
            p_idx = int(angulo / (2 * np.pi) * NUM_PUNTOS) % NUM_PUNTOS
            altura_local = perfil[p_idx]

            if direccion == "afuera":
                borde_int = r_ext
                borde_ext = r_ext + altura_local
                if dist < borde_int - 2 or dist > borde_ext + 2:
                    continue
                t = (dist - borde_int) / max(altura_local, 1.0)
            else:
                borde_ext = r_int
                borde_int = r_int - altura_local
                if dist < borde_int - 2 or dist > borde_ext + 2:
                    continue
                t = (borde_ext - dist) / max(altura_local, 1.0)

            t = max(0.0, min(1.0, t))

            pal_idx = int(angulo / (2 * np.pi) * n_pal) % n_pal
            color_local = palette[pal_idx]

            ruido_color = _ruido_organico(px, py, 12.0, semilla + 50)
            color = _color_mezclado(color_base, color_local,
                                      ruido_color, mezcla=0.50)

            alpha_base = (1.0 - t) ** 1.3

            if direccion == "afuera":
                exceso = dist - borde_ext
            else:
                exceso = borde_int - dist
            if exceso > 0:
                alpha_base *= max(0.0, 1.0 - exceso / 3.0)

            ruido_alpha = _ruido_organico(px, py, 22.0, semilla + 200)
            alpha_mod = alpha_base * (0.82 + ruido_alpha * 0.18)

            alpha = int(max(0, min(185, alpha_mod * 195)))
            if alpha < 10:
                continue

            if alpha > arr[py, px, 3]:
                arr[py, px, 0] = color[0]
                arr[py, px, 1] = color[1]
                arr[py, px, 2] = color[2]
                arr[py, px, 3] = alpha
            else:
                mix = alpha / 255.0
                arr[py, px, 0] = int(arr[py, px, 0] * (1 - mix * 0.4)
                                      + color[0] * mix * 0.4)
                arr[py, px, 1] = int(arr[py, px, 1] * (1 - mix * 0.4)
                                      + color[1] * mix * 0.4)
                arr[py, px, 2] = int(arr[py, px, 2] * (1 - mix * 0.4)
                                      + color[2] * mix * 0.4)

    capa = Image.fromarray(arr, "RGBA")

    # Suavizado gaussiano final en alfa
    canal_alpha = capa.split()[3].filter(ImageFilter.GaussianBlur(radius=1.2))
    capa.putalpha(canal_alpha)

    return capa


# ─────────────────────────────────────────────────────────────
# LEYENDA
# ─────────────────────────────────────────────────────────────

def _agregar_leyenda(image, ph, humedad, color_rgb, params_crestas):
    """Overlay con valores y estado al pie de la imagen."""
    img_rgba = image.convert("RGBA")
    overlay = Image.new("RGBA", img_rgba.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = img_rgba.size
    margen, y_base = 15, h - 110

    draw.rectangle(
        [(margen, y_base - 8), (w - margen, y_base + 102)],
        fill=(0, 0, 0, 195),
    )

    # En servidor no siempre están las fuentes Liberation; se hace fallback
    try:
        fnt_t = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        fnt_n = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 17)
    except Exception:
        fnt_t = ImageFont.load_default()
        fnt_n = ImageFont.load_default()

    r, g, b = color_rgb
    c_azul = (min(r + 60, 255), min(g + 60, 255), min(b + 60, 255), 255)
    dir_txt = {
        "adentro": "▼ Borde hacia adentro (ácido)",
        "afuera":  "▲ Borde hacia afuera (alcalino)",
        "ninguna": "— Anillo liso (neutro)",
    }[params_crestas["direccion"]]

    lineas = [
        (fnt_t, f"pH: {ph:.1f}  —  {_estado_ph(ph)}", (255, 220, 120, 255)),
        (fnt_n, f"Humedad: {humedad:.0f}%  —  {_estado_humedad(humedad)}",
         (200, 220, 255, 255)),
        (fnt_n, dir_txt, c_azul),
        (fnt_n, f"Amplitud: {params_crestas['altura_px']}px "
                f"({params_crestas['altura_pct']:.1f}%)", (180, 180, 180, 255)),
    ]
    y = y_base
    for fnt, txt, col in lineas:
        draw.text((margen + 12, y), txt, font=fnt, fill=col)
        y += 24

    return Image.alpha_composite(img_rgba, overlay).convert("RGB")


# ─────────────────────────────────────────────────────────────
# API PÚBLICA
# ─────────────────────────────────────────────────────────────

def generar_anillo(
    imagen_bytes: bytes,
    ph: float,
    humedad: float,
    config: Optional[Dict] = None,
    agregar_leyenda: bool = True,
) -> Tuple[Image.Image, Dict]:
    """
    Genera el cromatograma con anillo orgánico paramétrico.

    Args:
        imagen_bytes:    bytes del archivo de imagen subido
        ph:              valor entre 0 y 14
        humedad:         valor entre 0 y 100
        config:          configuración opcional de radios
        agregar_leyenda: si añade la leyenda inferior

    Returns:
        (imagen_final, metadata)
    """
    cfg = config or CONFIG_DEFECTO

    ph = max(0.0, min(14.0, float(ph)))
    humedad = max(0.0, min(100.0, float(humedad)))

    # Cargar y normalizar a 1024x1024
    imagen_base = Image.open(BytesIO(imagen_bytes)).convert("RGB").resize((1024, 1024))

    # Semilla determinista
    semilla = int(
        hashlib.md5(imagen_base.tobytes()[:1024]).hexdigest()[:8], 16
    ) % 1000

    color_base = _color_por_humedad(humedad)
    palette = _muestrear_palette_local(imagen_base, cfg)
    params = _parametros_crestas(ph, cfg)

    resultado = imagen_base.copy().convert("RGBA")
    capa = Image.new("RGBA", resultado.size, (0, 0, 0, 0))

    capa = _dibujar_anillo_organico(capa, color_base, palette, cfg, semilla)
    capa = _dibujar_borde_terrain(capa, color_base, palette, ph, cfg, semilla)

    resultado = Image.alpha_composite(resultado, capa).convert("RGB")

    if agregar_leyenda:
        color_rep = _color_mezclado(
            color_base, palette.mean(axis=0).astype(int), 0.0, mezcla=0.52
        )
        resultado = _agregar_leyenda(resultado, ph, humedad, color_rep, params)

    metadata = {
        "ph": ph,
        "humedad": humedad,
        "estado_ph": _estado_ph(ph),
        "estado_humedad": _estado_humedad(humedad),
        "direccion_borde": params["direccion"],
        "amplitud_px": params["altura_px"],
        "amplitud_pct": params["altura_pct"],
    }

    return resultado, metadata
