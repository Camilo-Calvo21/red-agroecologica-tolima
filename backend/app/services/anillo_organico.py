"""
Generador de anillo paramétrico orgánico.

Versión OPTIMIZADA para servidor (Render Free).
Todas las operaciones pesadas están vectorizadas con NumPy.
Mismo resultado visual que la versión pixel-a-pixel, ~50-100x más rápido.

API pública:
    generar_anillo(imagen_bytes, ph, humedad, ...) -> (Image, metadata)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import numpy as np
import hashlib
import logging
import time
from typing import Tuple, Dict, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# CONFIGURACIÓN POR DEFECTO
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
# RUIDO ORGÁNICO VECTORIZADO
# ─────────────────────────────────────────────────────────────

def _ruido_organico_vec(x: np.ndarray, y: np.ndarray,
                        escala: float = 40.0, semilla: int = 42) -> np.ndarray:
    """Ruido 2D estilo Perlin — vectorizado."""
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
                            semilla: int, complejidad: float = 0.5) -> np.ndarray:
    """Perfil organico con complejidad variable segun pH.
    complejidad baja (0.2-0.4): ondulaciones suaves, pocas frecuencias.
    complejidad media (0.5): equilibrado, como relieve montanoso suave.
    complejidad alta (0.7-0.9): mas detalle, mas frecuencias activas."""
    rng = np.random.RandomState(semilla)
    phi = 1.6180339887
    complejidad = max(0.1, min(1.0, complejidad))

    # Frecuencias base — las altas se activan con mayor complejidad
    base_frecs = np.array([
        1.0 + rng.uniform(-0.2, 0.2),
        2.0 * phi + rng.uniform(-0.3, 0.3),
        4.0 * np.pi / 3 + rng.uniform(-0.5, 0.5),
        7.0 * phi + rng.uniform(-0.5, 0.5),
        13.0 + rng.uniform(-1.0, 1.0),
    ])

    # Amplitudes moduladas por complejidad
    # Baja complejidad: solo las primeras 2 frecuencias dominan
    # Alta complejidad: todas las frecuencias contribuyen
    amp_base = np.array([1.0, 0.55, 0.32, 0.18, 0.10])
    amp_mask = np.array([1.0,
                         0.5 + 0.5 * complejidad,
                         complejidad ** 0.8,
                         complejidad ** 1.2,
                         complejidad ** 1.5])
    amplitudes = amp_base * amp_mask

    fases = rng.uniform(0, 2 * np.pi, size=len(base_frecs))

    theta = np.linspace(0, 2 * np.pi, num_puntos, endpoint=False)
    perfil = np.zeros(num_puntos, dtype=np.float32)
    for amp, frec, fase in zip(amplitudes, base_frecs, fases):
        perfil += amp * np.sin(theta * frec + fase)

    perfil = perfil - perfil.min()
    perfil = perfil / max(perfil.max(), 1e-6)

    # Suavidad: baja complejidad = mas suave, alta = mas picos definidos
    gamma = 1.8 - complejidad * 0.6  # 1.2 a 1.8
    perfil = np.power(perfil, gamma)

    # Modulacion de amplitud local
    mod = np.zeros(num_puntos, dtype=np.float32)
    n_mods = 2 + int(complejidad * 2)  # 2 a 4 moduladores
    for k in range(n_mods):
        f = 0.5 + k * 1.3
        p = rng.uniform(0, 2 * np.pi)
        mod += np.sin(theta * f + p) / (k + 1)
    mod = (mod - mod.min()) / max(mod.max() - mod.min(), 1e-6)
    # Menor complejidad = modulacion mas uniforme
    uniformidad = 0.5 - complejidad * 0.2  # 0.3 a 0.5
    mod = uniformidad + (1.0 - uniformidad) * mod

    perfil = perfil * mod
    return perfil * altura_max


# ─────────────────────────────────────────────────────────────
# MUESTREO DE PALETTE LOCAL
# ─────────────────────────────────────────────────────────────

def _muestrear_palette_local(imagen_base: Image.Image, config: dict,
                             n_muestras: int = 720) -> np.ndarray:
    """Captura el color real del borde del cromatograma — vectorizado."""
    arr = np.array(imagen_base.convert("RGB"))
    cx, cy = config["cx"], config["cy"]
    r_muestra = (config["r_interno"] + config["r_externo"]) / 2

    angulos = np.linspace(0, 2 * np.pi, n_muestras, endpoint=False)
    palette = np.zeros((n_muestras, 3), dtype=np.float32)

    for dr in (-8, -4, 0, 4, 8):
        r = r_muestra + dr
        xs = np.clip((cx + r * np.cos(angulos)).astype(int), 0, arr.shape[1] - 1)
        ys = np.clip((cy + r * np.sin(angulos)).astype(int), 0, arr.shape[0] - 1)
        palette += arr[ys, xs].astype(np.float32)

    palette /= 5.0
    return palette


# ─────────────────────────────────────────────────────────────
# MAPEO DE PARÁMETROS
# ─────────────────────────────────────────────────────────────

def _color_por_humedad(humedad: float) -> Tuple[int, int, int]:
    """Rampa amarillo-verde-ciano segun humedad.
    0% = amarillo (seco), 50% = verde (optimo), 100% = ciano (saturado)."""
    h = max(0.0, min(100.0, humedad))
    t = h / 100.0
    puntos = [
        (0.00, (230, 210, 30)),
        (0.25, (160, 210, 30)),
        (0.50, (30, 200, 60)),
        (0.75, (20, 200, 160)),
        (1.00, (0, 210, 220)),
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
    """Siempre genera ondulaciones organicas.
    pH cercano a 0: suaves y pocas. pH ~7: moderadas. pH ~14: mas complejas.
    La direccion indica si las crestas empujan hacia adentro (acido) o afuera (alcalino)."""
    ph = max(0.0, min(14.0, float(ph)))
    altura_max = config["altura_max_px"]
    # Minimo base de ondulacion para que NUNCA sea un circulo perfecto
    min_altura = max(8, int(altura_max * 0.15))
    if abs(ph - 7.0) < 0.3:
        # Cerca del neutro: ondulaciones moderadas, ambas direcciones sutiles
        return {"direccion": "ambas",
                "altura_px": max(min_altura, int(altura_max * 0.25)),
                "altura_pct": 25.0,
                "complejidad": 0.5}
    if ph < 7.0:
        # Acido: ondulaciones suaves, pocas
        distancia = (7.0 - ph) / 7.0  # 0 a 1
        pct = 0.15 + distancia * 0.45  # 15% a 60%
        complejidad = 0.3 + distancia * 0.3  # 0.3 a 0.6
        return {"direccion": "adentro",
                "altura_px": max(min_altura, int(pct * altura_max)),
                "altura_pct": pct * 100,
                "complejidad": complejidad}
    # Alcalino: ondulaciones mas complejas
    distancia = (ph - 7.0) / 7.0  # 0 a 1
    pct = 0.15 + distancia * 0.55  # 15% a 70%
    complejidad = 0.4 + distancia * 0.5  # 0.4 a 0.9
    return {"direccion": "afuera",
            "altura_px": max(min_altura, int(pct * altura_max)),
            "altura_pct": pct * 100,
            "complejidad": complejidad}


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
# RENDERIZADO VECTORIZADO DEL ANILLO
# ─────────────────────────────────────────────────────────────

def _dibujar_anillo_organico_vec(capa, color_base, palette, config, semilla):
    """Corona base con muestreo de palette local — VECTORIZADO."""
    cx, cy = config["cx"], config["cy"]
    r_int = config["r_interno"]
    r_ext = config["r_externo"]
    ancho = r_ext - r_int
    n_pal = len(palette)

    margen = 80
    y_min = max(0, cy - r_ext - margen)
    y_max = min(1024, cy + r_ext + margen)
    x_min = max(0, cx - r_ext - margen)
    x_max = min(1024, cx + r_ext + margen)

    # Crear grids de coordenadas
    ys = np.arange(y_min, y_max)
    xs = np.arange(x_min, x_max)
    px_grid, py_grid = np.meshgrid(xs, ys)

    dx = px_grid.astype(np.float32) - cx
    dy = py_grid.astype(np.float32) - cy
    dist = np.sqrt(dx * dx + dy * dy)

    # Ruido para variación de grosor
    ruido_grosor = _ruido_organico_vec(px_grid.astype(np.float32),
                                       py_grid.astype(np.float32), 120.0, semilla)
    r_int_var = r_int + ruido_grosor * 3
    r_ext_var = r_ext + ruido_grosor * 4

    # Máscara: solo píxeles dentro del rango del anillo
    mascara = (dist >= r_int_var - 2) & (dist <= r_ext_var + 2)

    if not np.any(mascara):
        return capa

    # Ángulos y palette index
    angulo = np.arctan2(dy, dx)
    angulo = np.where(angulo < 0, angulo + 2 * np.pi, angulo)
    pal_idx = (angulo / (2 * np.pi) * n_pal).astype(int) % n_pal

    # Ruido de color
    ruido_color = _ruido_organico_vec(px_grid.astype(np.float32),
                                      py_grid.astype(np.float32), 15.0, semilla)

    # Color mezclado vectorizado
    mezcla = 0.52
    color_local_r = palette[pal_idx, 0]
    color_local_g = palette[pal_idx, 1]
    color_local_b = palette[pal_idx, 2]

    r_ch = color_base[0] * (1 - mezcla) + color_local_r * mezcla + ruido_color * 12 + ruido_color * 6
    g_ch = color_base[1] * (1 - mezcla) + color_local_g * mezcla + ruido_color * 10
    b_ch = color_base[2] * (1 - mezcla) + color_local_b * mezcla + ruido_color * 8 - ruido_color * 6

    r_ch = np.clip(r_ch, 0, 255)
    g_ch = np.clip(g_ch, 0, 255)
    b_ch = np.clip(b_ch, 0, 255)

    # Alpha basado en posición dentro del anillo
    t = (dist - r_int_var) / max(ancho, 1)
    t = np.clip(t, 0.0, 1.0)

    alpha_base = np.where(t < 0.4, t / 0.4, 1 - (t - 0.4) / 0.6)
    alpha_base = np.clip(alpha_base, 0.0, 1.0) ** 0.8

    # Fade en bordes
    fade_int = np.where(dist < r_int_var, 1.0 - (r_int_var - dist) / 3.0, 1.0)
    fade_ext = np.where(dist > r_ext_var, 1.0 - (dist - r_ext_var) / 3.0, 1.0)
    alpha_base = alpha_base * np.clip(fade_int, 0, 1) * np.clip(fade_ext, 0, 1)

    # Ruido en alpha
    ruido_alpha = _ruido_organico_vec(px_grid.astype(np.float32),
                                      py_grid.astype(np.float32), 25.0, semilla + 100)
    alpha_mod = alpha_base * (0.85 + ruido_alpha * 0.15)
    alpha = np.clip(alpha_mod * 175, 0, 170).astype(np.uint8)

    # Filtrar píxeles con alpha muy bajo
    mascara = mascara & (alpha >= 8)

    if not np.any(mascara):
        return capa

    # Escribir en el array
    arr = np.array(capa)
    arr[py_grid[mascara], px_grid[mascara], 0] = r_ch[mascara].astype(np.uint8)
    arr[py_grid[mascara], px_grid[mascara], 1] = g_ch[mascara].astype(np.uint8)
    arr[py_grid[mascara], px_grid[mascara], 2] = b_ch[mascara].astype(np.uint8)
    arr[py_grid[mascara], px_grid[mascara], 3] = np.maximum(
        arr[py_grid[mascara], px_grid[mascara], 3],
        alpha[mascara]
    )

    return Image.fromarray(arr, "RGBA")


def _dibujar_borde_terrain_vec(capa, color_base, palette, ph, config, semilla):
    """Borde terrain-like organico — VECTORIZADO. Siempre con ondulaciones."""
    params = _parametros_crestas(ph, config)
    if params["altura_px"] == 0:
        return capa

    cx, cy = config["cx"], config["cy"]
    r_int = config["r_interno"]
    r_ext = config["r_externo"]
    altura_max = params["altura_px"]
    direccion = params["direccion"]
    complejidad = params.get("complejidad", 0.5)
    n_pal = len(palette)

    # Si direccion es "ambas" (pH neutro), dibujar mitad adentro mitad afuera
    if direccion == "ambas":
        # Primero dibujar crestas suaves hacia adentro
        params_in = dict(params)
        params_in["direccion"] = "adentro"
        params_in["altura_px"] = max(6, params["altura_px"] // 2)
        capa = _dibujar_borde_terrain_vec_single(
            capa, color_base, palette, ph, config, semilla, params_in, complejidad)
        # Luego crestas suaves hacia afuera
        params_out = dict(params)
        params_out["direccion"] = "afuera"
        params_out["altura_px"] = max(6, params["altura_px"] // 2)
        capa = _dibujar_borde_terrain_vec_single(
            capa, color_base, palette, ph, config, semilla + 7, params_out, complejidad)
        return capa

    return _dibujar_borde_terrain_vec_single(
        capa, color_base, palette, ph, config, semilla, params, complejidad)


def _dibujar_borde_terrain_vec_single(capa, color_base, palette, ph, config,
                                       semilla, params, complejidad):
    """Dibuja un borde terrain en una sola direccion."""
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
        complejidad=complejidad,
    )

    margen = altura_max + 8
    y_min = max(0, cy - r_ext - margen)
    y_max = min(1024, cy + r_ext + margen)
    x_min = max(0, cx - r_ext - margen)
    x_max = min(1024, cx + r_ext + margen)

    ys = np.arange(y_min, y_max)
    xs = np.arange(x_min, x_max)
    px_grid, py_grid = np.meshgrid(xs, ys)

    dx = px_grid.astype(np.float32) - cx
    dy = py_grid.astype(np.float32) - cy
    dist = np.sqrt(dx * dx + dy * dy)

    angulo = np.arctan2(dy, dx)
    angulo = np.where(angulo < 0, angulo + 2 * np.pi, angulo)
    p_idx = (angulo / (2 * np.pi) * NUM_PUNTOS).astype(int) % NUM_PUNTOS
    altura_local = perfil[p_idx]

    if direccion == "afuera":
        borde_int = np.full_like(dist, r_ext, dtype=np.float32)
        borde_ext = r_ext + altura_local
        mascara = (dist >= borde_int - 2) & (dist <= borde_ext + 2)
        t = np.where(altura_local > 0, (dist - borde_int) / np.maximum(altura_local, 1.0), 0)
    else:
        borde_ext_val = np.full_like(dist, r_int, dtype=np.float32)
        borde_int_val = r_int - altura_local
        mascara = (dist >= borde_int_val - 2) & (dist <= borde_ext_val + 2)
        t = np.where(altura_local > 0, (borde_ext_val - dist) / np.maximum(altura_local, 1.0), 0)

    t = np.clip(t, 0.0, 1.0)

    if not np.any(mascara):
        return capa

    # Palette y color
    pal_idx = (angulo / (2 * np.pi) * n_pal).astype(int) % n_pal
    color_local_r = palette[pal_idx, 0]
    color_local_g = palette[pal_idx, 1]
    color_local_b = palette[pal_idx, 2]

    ruido_color = _ruido_organico_vec(px_grid.astype(np.float32),
                                      py_grid.astype(np.float32), 12.0, semilla + 50)
    mix = 0.50
    r_ch = color_base[0] * (1 - mix) + color_local_r * mix + ruido_color * 12 + ruido_color * 6
    g_ch = color_base[1] * (1 - mix) + color_local_g * mix + ruido_color * 10
    b_ch = color_base[2] * (1 - mix) + color_local_b * mix + ruido_color * 8 - ruido_color * 6
    r_ch = np.clip(r_ch, 0, 255)
    g_ch = np.clip(g_ch, 0, 255)
    b_ch = np.clip(b_ch, 0, 255)

    # Alpha
    alpha_base = (1.0 - t) ** 1.3

    if direccion == "afuera":
        exceso = dist - borde_ext
    else:
        exceso = borde_int_val - dist
    fade = np.where(exceso > 0, np.clip(1.0 - exceso / 3.0, 0, 1), 1.0)
    alpha_base = alpha_base * fade

    ruido_alpha = _ruido_organico_vec(px_grid.astype(np.float32),
                                      py_grid.astype(np.float32), 22.0, semilla + 200)
    alpha_mod = alpha_base * (0.82 + ruido_alpha * 0.18)
    alpha = np.clip(alpha_mod * 195, 0, 185).astype(np.uint8)

    mascara = mascara & (alpha >= 10)

    if not np.any(mascara):
        return capa

    arr = np.array(capa)
    existing_alpha = arr[py_grid[mascara], px_grid[mascara], 3]
    new_alpha = alpha[mascara]

    # Donde el nuevo alpha es mayor, reemplazar
    replace = new_alpha > existing_alpha
    blend = ~replace

    m_py = py_grid[mascara]
    m_px = px_grid[mascara]
    m_r = r_ch[mascara].astype(np.uint8)
    m_g = g_ch[mascara].astype(np.uint8)
    m_b = b_ch[mascara].astype(np.uint8)

    if np.any(replace):
        arr[m_py[replace], m_px[replace], 0] = m_r[replace]
        arr[m_py[replace], m_px[replace], 1] = m_g[replace]
        arr[m_py[replace], m_px[replace], 2] = m_b[replace]
        arr[m_py[replace], m_px[replace], 3] = new_alpha[replace]

    if np.any(blend):
        mix_factor = new_alpha[blend].astype(np.float32) / 255.0 * 0.4
        arr[m_py[blend], m_px[blend], 0] = (
            arr[m_py[blend], m_px[blend], 0].astype(np.float32) * (1 - mix_factor)
            + m_r[blend].astype(np.float32) * mix_factor
        ).astype(np.uint8)
        arr[m_py[blend], m_px[blend], 1] = (
            arr[m_py[blend], m_px[blend], 1].astype(np.float32) * (1 - mix_factor)
            + m_g[blend].astype(np.float32) * mix_factor
        ).astype(np.uint8)
        arr[m_py[blend], m_px[blend], 2] = (
            arr[m_py[blend], m_px[blend], 2].astype(np.float32) * (1 - mix_factor)
            + m_b[blend].astype(np.float32) * mix_factor
        ).astype(np.uint8)

    capa = Image.fromarray(arr, "RGBA")

    # Suavizado gaussiano final en alfa
    canal_alpha = capa.split()[3].filter(ImageFilter.GaussianBlur(radius=1.2))
    capa.putalpha(canal_alpha)

    return capa


# ─────────────────────────────────────────────────────────────
# LEYENDA
# ─────────────────────────────────────────────────────────────

def _color_mezclado_simple(color_base, color_local, mezcla=0.52):
    """Mezcla para la leyenda (no vectorizada, solo 1 pixel)."""
    r = color_base[0] * (1 - mezcla) + color_local[0] * mezcla
    g = color_base[1] * (1 - mezcla) + color_local[1] * mezcla
    b = color_base[2] * (1 - mezcla) + color_local[2] * mezcla
    return (int(max(0, min(255, r))),
            int(max(0, min(255, g))),
            int(max(0, min(255, b))))


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
        "adentro": "▼ Ondulaciones hacia adentro (ácido)",
        "afuera": "▲ Ondulaciones hacia afuera (alcalino)",
        "ambas": "↕ Ondulaciones suaves (neutro)",
        "ninguna": "— Ondulaciones mínimas (neutro)",
    }.get(params_crestas["direccion"], "— Ondulaciones orgánicas")

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

    Versión vectorizada — ~50-100x más rápida que pixel-a-pixel.
    """
    t0 = time.time()
    cfg = config or CONFIG_DEFECTO

    ph = max(0.0, min(14.0, float(ph)))
    humedad = max(0.0, min(100.0, float(humedad)))

    # Cargar y normalizar
    imagen_base = Image.open(BytesIO(imagen_bytes)).convert("RGB").resize((1024, 1024))
    logger.info(f"   Imagen cargada y redimensionada: {time.time() - t0:.2f}s")

    # Semilla determinista
    semilla = int(
        hashlib.md5(imagen_base.tobytes()[:1024]).hexdigest()[:8], 16
    ) % 1000

    color_base = _color_por_humedad(humedad)
    palette = _muestrear_palette_local(imagen_base, cfg)
    params = _parametros_crestas(ph, cfg)
    logger.info(f"   Parámetros calculados: {time.time() - t0:.2f}s")

    resultado = imagen_base.copy().convert("RGBA")
    capa = Image.new("RGBA", resultado.size, (0, 0, 0, 0))

    # Dibujar anillo y borde — VECTORIZADO
    capa = _dibujar_anillo_organico_vec(capa, color_base, palette, cfg, semilla)
    logger.info(f"   Anillo orgánico dibujado: {time.time() - t0:.2f}s")

    capa = _dibujar_borde_terrain_vec(capa, color_base, palette, ph, cfg, semilla)
    logger.info(f"   Borde terrain dibujado: {time.time() - t0:.2f}s")

    resultado = Image.alpha_composite(resultado, capa).convert("RGB")

    if agregar_leyenda:
        color_rep = _color_mezclado_simple(
            color_base, palette.mean(axis=0).astype(int), mezcla=0.52
        )
        resultado = _agregar_leyenda(resultado, ph, humedad, color_rep, params)

    logger.info(f"   TOTAL generación anillo: {time.time() - t0:.2f}s")

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
