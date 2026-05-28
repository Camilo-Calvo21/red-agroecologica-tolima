"""
Generador de anillo parametrico organico.

FIRMA VISUAL DIFERENCIADA POR pH:
- Acido (0-6): ondulaciones DENSAS, pequenas, comprimidas, muchas colinas suaves
- Neutro (~7): ondulaciones MODERADAS, equilibradas, fluidas
- Alcalino (8-14): ondulaciones AMPLIAS, espaciadas, crestas largas y abiertas

Los bordes interno y externo se deforman organicamente.
Optimizado con NumPy vectorizado.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import numpy as np
import hashlib
import logging
import time
from typing import Tuple, Dict, Optional

logger = logging.getLogger(__name__)

CONFIG_DEFECTO: Dict = {
    "cx": 512,
    "cy": 512,
    "r_interno": 415,
    "r_externo": 488,
    "num_crestas": 36,
    "altura_max_px": 60,
}


def _ruido_organico_vec(x, y, escala=40.0, semilla=42):
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
# PERFIL ONDULADO CON FIRMA VISUAL SEGUN PH
# ─────────────────────────────────────────────────────────────

def _generar_perfil_ph(num_puntos, amplitud, ph, semilla):
    """Genera un perfil de ondulacion con FIRMA VISUAL distinta segun pH.
    
    ACIDO (ph < 6): muchas ondulaciones pequenas y densas.
      - Frecuencias altas dominan (8-20 ciclos por vuelta)
      - Amplitudes pequenas
      - Sensacion de vibracion comprimida
    
    NEUTRO (ph ~ 7): ondulaciones moderadas y equilibradas.
      - Frecuencias medias (4-8 ciclos)
      - Amplitudes medias
      - Sensacion fluida y estable
    
    ALCALINO (ph > 8): pocas ondulaciones amplias y espaciadas.
      - Frecuencias bajas dominan (2-5 ciclos)
      - Amplitudes grandes
      - Sensacion de expansion, crestas largas
    """
    rng = np.random.RandomState(semilla)
    phi_gold = 1.6180339887
    theta = np.linspace(0, 2 * np.pi, num_puntos, endpoint=False)
    
    # Factor de acidez: 0 = muy acido, 1 = muy alcalino
    factor_alk = max(0.0, min(1.0, ph / 14.0))
    
    # ── FRECUENCIAS: cambian radicalmente segun pH ──
    if ph < 5.0:
        # MUY ACIDO: frecuencias altas, muchas ondulaciones densas
        freqs = np.array([
            8.0 + rng.uniform(-0.5, 0.5),
            12.0 * phi_gold + rng.uniform(-1, 1),
            15.0 + rng.uniform(-1, 1),
            19.0 + rng.uniform(-1.5, 1.5),
            23.0 * phi_gold + rng.uniform(-2, 2),
            5.0 + rng.uniform(-0.3, 0.3),
        ])
        amps = np.array([1.0, 0.7, 0.5, 0.35, 0.2, 0.6])
        
    elif ph < 6.5:
        # ACIDO: frecuencias medio-altas
        freqs = np.array([
            6.0 + rng.uniform(-0.4, 0.4),
            9.0 + rng.uniform(-0.5, 0.5),
            13.0 * phi_gold + rng.uniform(-1, 1),
            4.0 + rng.uniform(-0.3, 0.3),
            16.0 + rng.uniform(-1, 1),
        ])
        amps = np.array([1.0, 0.65, 0.4, 0.5, 0.25])
        
    elif ph <= 7.5:
        # NEUTRO: frecuencias medias equilibradas
        freqs = np.array([
            3.0 + rng.uniform(-0.2, 0.2),
            5.0 * phi_gold + rng.uniform(-0.3, 0.3),
            7.0 + rng.uniform(-0.4, 0.4),
            2.0 + rng.uniform(-0.15, 0.15),
            10.0 + rng.uniform(-0.5, 0.5),
        ])
        amps = np.array([1.0, 0.6, 0.4, 0.7, 0.2])
        
    elif ph < 9.5:
        # ALCALINO: frecuencias medio-bajas, crestas mas anchas
        freqs = np.array([
            2.0 + rng.uniform(-0.15, 0.15),
            3.0 * phi_gold + rng.uniform(-0.2, 0.2),
            1.5 + rng.uniform(-0.1, 0.1),
            5.0 + rng.uniform(-0.3, 0.3),
            4.0 * phi_gold + rng.uniform(-0.3, 0.3),
        ])
        amps = np.array([1.0, 0.7, 0.8, 0.35, 0.45])
        
    else:
        # MUY ALCALINO: frecuencias bajas, pocas crestas grandes y abiertas
        freqs = np.array([
            1.0 + rng.uniform(-0.08, 0.08),
            1.5 + rng.uniform(-0.1, 0.1),
            2.0 * phi_gold + rng.uniform(-0.15, 0.15),
            3.0 + rng.uniform(-0.2, 0.2),
            0.7 + rng.uniform(-0.05, 0.05),
        ])
        amps = np.array([1.0, 0.85, 0.6, 0.4, 0.9])
    
    fases = rng.uniform(0, 2 * np.pi, size=len(freqs))
    
    perfil = np.zeros(num_puntos, dtype=np.float32)
    for amp, frec, fase in zip(amps, freqs, fases):
        perfil += amp * np.sin(theta * frec + fase)
    
    # Normalizar a [-1, 1]
    rango = max(perfil.max() - perfil.min(), 1e-6)
    perfil = 2.0 * (perfil - perfil.min()) / rango - 1.0
    
    # ── SUAVIZADO: acido mas suave/redondeado, alcalino mas definido ──
    if ph < 6.0:
        # Acido: redondear picos (mas organico, como difusion quimica)
        perfil = np.sign(perfil) * np.power(np.abs(perfil), 1.4)
    elif ph > 8.0:
        # Alcalino: picos mas definidos pero sin esquinas
        perfil = np.sign(perfil) * np.power(np.abs(perfil), 0.75)
    
    # ── MODULACION LOCAL: zonas mas activas y zonas mas calmas ──
    mod = np.zeros(num_puntos, dtype=np.float32)
    n_mod = 3
    for k in range(n_mod):
        f = 0.3 + k * 0.9
        p = rng.uniform(0, 2 * np.pi)
        mod += np.sin(theta * f + p) / (k + 1)
    mod = (mod - mod.min()) / max(mod.max() - mod.min(), 1e-6)
    mod = 0.45 + 0.55 * mod
    
    perfil = perfil * mod
    return perfil * amplitud


# ─────────────────────────────────────────────────────────────
# PARAMETROS SEGUN PH
# ─────────────────────────────────────────────────────────────

def _parametros_crestas(ph, config):
    ph = max(0.0, min(14.0, float(ph)))
    altura_max = config["altura_max_px"]
    dist = abs(ph - 7.0)
    
    # Amplitud: siempre al menos 14px
    amplitud_min = 14
    amplitud = amplitud_min + (dist / 7.0) * (altura_max - amplitud_min)
    amplitud = max(amplitud_min, min(altura_max, amplitud))
    
    if ph < 6.7:
        direccion = "adentro"
    elif ph > 7.3:
        direccion = "afuera"
    else:
        direccion = "ambas"
    
    return {
        "direccion": direccion,
        "altura_px": int(amplitud),
        "altura_pct": (amplitud / altura_max) * 100,
    }


def _muestrear_palette_local(imagen_base, config, n_muestras=720):
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


def _color_por_humedad(humedad):
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


def _estado_ph(ph):
    tabla = [(5.0, "Muy acido"), (5.8, "Acido"), (6.5, "Lig. acido"),
             (7.2, "Neutro (optimo)"), (8.0, "Lig. alcalino"),
             (9.0, "Alcalino")]
    for lim, est in tabla:
        if ph < lim:
            return est
    return "Muy alcalino"


def _estado_humedad(h):
    tabla = [(20, "Extremadamente seco"), (35, "Seco"), (50, "Moderado"),
             (70, "Optimo"), (85, "Humedo")]
    for lim, est in tabla:
        if h < lim:
            return est
    return "Saturado"


# ─────────────────────────────────────────────────────────────
# RENDERIZADO DEL ANILLO CON BORDES ONDULADOS
# ─────────────────────────────────────────────────────────────

def _dibujar_anillo_ondulado_vec(capa, color_base, palette, config, semilla,
                                  params_ph, ph):
    """Anillo con bordes ondulados. La FIRMA VISUAL cambia segun pH."""
    cx, cy = config["cx"], config["cy"]
    r_int_base = config["r_interno"]
    r_ext_base = config["r_externo"]
    n_pal = len(palette)
    
    amplitud = params_ph["altura_px"]
    direccion = params_ph["direccion"]
    
    NUM_ANG = 1440
    
    # Generar perfiles con firma visual diferenciada
    perfil_ext = _generar_perfil_ph(NUM_ANG, amplitud, ph, semilla + 17)
    perfil_int = _generar_perfil_ph(NUM_ANG, amplitud * 0.55, ph, semilla + 31)
    
    if direccion == "adentro":
        perfil_int = -np.abs(perfil_int) * 1.3
        perfil_ext = perfil_ext * 0.25
    elif direccion == "afuera":
        perfil_ext = np.abs(perfil_ext) * 1.3
        perfil_int = perfil_int * 0.25
    else:
        perfil_ext = perfil_ext * 0.65
        perfil_int = -perfil_int * 0.65
    
    max_deform = max(np.abs(perfil_ext).max(), np.abs(perfil_int).max())
    margen = int(max_deform) + 15
    
    y_min = max(0, cy - r_ext_base - margen)
    y_max = min(1024, cy + r_ext_base + margen)
    x_min = max(0, cx - r_ext_base - margen)
    x_max = min(1024, cx + r_ext_base + margen)
    
    ys = np.arange(y_min, y_max)
    xs = np.arange(x_min, x_max)
    px_grid, py_grid = np.meshgrid(xs, ys)
    
    dx = px_grid.astype(np.float32) - cx
    dy = py_grid.astype(np.float32) - cy
    dist = np.sqrt(dx * dx + dy * dy)
    
    angulo = np.arctan2(dy, dx)
    angulo = np.where(angulo < 0, angulo + 2 * np.pi, angulo)
    ang_idx = (angulo / (2 * np.pi) * NUM_ANG).astype(int) % NUM_ANG
    
    r_int_ondulado = r_int_base + perfil_int[ang_idx]
    r_ext_ondulado = r_ext_base + perfil_ext[ang_idx]
    
    # Micro-ruido organico
    ruido_grosor = _ruido_organico_vec(px_grid.astype(np.float32),
                                       py_grid.astype(np.float32), 80.0, semilla)
    r_int_ondulado = r_int_ondulado + ruido_grosor * 2
    r_ext_ondulado = r_ext_ondulado + ruido_grosor * 3
    
    mascara = (dist >= r_int_ondulado - 2) & (dist <= r_ext_ondulado + 2)
    
    if not np.any(mascara):
        return capa
    
    pal_idx = (angulo / (2 * np.pi) * n_pal).astype(int) % n_pal
    ruido_color = _ruido_organico_vec(px_grid.astype(np.float32),
                                      py_grid.astype(np.float32), 15.0, semilla)
    mezcla = 0.52
    r_ch = color_base[0] * (1 - mezcla) + palette[pal_idx, 0] * mezcla + ruido_color * 18
    g_ch = color_base[1] * (1 - mezcla) + palette[pal_idx, 1] * mezcla + ruido_color * 10
    b_ch = color_base[2] * (1 - mezcla) + palette[pal_idx, 2] * mezcla + ruido_color * 8
    r_ch = np.clip(r_ch, 0, 255)
    g_ch = np.clip(g_ch, 0, 255)
    b_ch = np.clip(b_ch, 0, 255)
    
    ancho_local = np.maximum(r_ext_ondulado - r_int_ondulado, 1.0)
    t = (dist - r_int_ondulado) / ancho_local
    t = np.clip(t, 0.0, 1.0)
    
    alpha_base = np.where(t < 0.2, t / 0.2,
                 np.where(t > 0.8, (1.0 - t) / 0.2, 1.0))
    alpha_base = np.clip(alpha_base, 0.0, 1.0) ** 0.65
    
    fade_int = np.where(dist < r_int_ondulado,
                        np.clip(1.0 - (r_int_ondulado - dist) / 4.0, 0, 1), 1.0)
    fade_ext = np.where(dist > r_ext_ondulado,
                        np.clip(1.0 - (dist - r_ext_ondulado) / 4.0, 0, 1), 1.0)
    alpha_base = alpha_base * fade_int * fade_ext
    
    ruido_alpha = _ruido_organico_vec(px_grid.astype(np.float32),
                                      py_grid.astype(np.float32), 25.0, semilla + 100)
    alpha_mod = alpha_base * (0.82 + ruido_alpha * 0.18)
    alpha = np.clip(alpha_mod * 190, 0, 185).astype(np.uint8)
    
    mascara = mascara & (alpha >= 8)
    if not np.any(mascara):
        return capa
    
    arr = np.array(capa)
    arr[py_grid[mascara], px_grid[mascara], 0] = r_ch[mascara].astype(np.uint8)
    arr[py_grid[mascara], px_grid[mascara], 1] = g_ch[mascara].astype(np.uint8)
    arr[py_grid[mascara], px_grid[mascara], 2] = b_ch[mascara].astype(np.uint8)
    arr[py_grid[mascara], px_grid[mascara], 3] = np.maximum(
        arr[py_grid[mascara], px_grid[mascara], 3], alpha[mascara])
    
    capa = Image.fromarray(arr, "RGBA")
    canal_alpha = capa.split()[3].filter(ImageFilter.GaussianBlur(radius=1.5))
    capa.putalpha(canal_alpha)
    return capa


# ─────────────────────────────────────────────────────────────
# LEYENDA
# ─────────────────────────────────────────────────────────────

def _color_mezclado_simple(color_base, color_local, mezcla=0.52):
    r = color_base[0] * (1 - mezcla) + color_local[0] * mezcla
    g = color_base[1] * (1 - mezcla) + color_local[1] * mezcla
    b = color_base[2] * (1 - mezcla) + color_local[2] * mezcla
    return (int(max(0, min(255, r))),
            int(max(0, min(255, g))),
            int(max(0, min(255, b))))


def _agregar_leyenda(image, ph, humedad, color_rgb, params_crestas):
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
    c_color = (min(r + 60, 255), min(g + 60, 255), min(b + 60, 255), 255)
    dir_map = {
        "adentro": "\u25bc Ondulaciones densas hacia adentro (acido)",
        "afuera": "\u25b2 Ondulaciones amplias hacia afuera (alcalino)",
        "ambas": "\u2195 Ondulaciones equilibradas (neutro)",
    }
    dir_txt = dir_map.get(params_crestas["direccion"], "~ Ondulaciones organicas")
    
    lineas = [
        (fnt_t, "pH: {:.1f}  \u2014  {}".format(ph, _estado_ph(ph)), (255, 220, 120, 255)),
        (fnt_n, "Humedad: {:.0f}%  \u2014  {}".format(humedad, _estado_humedad(humedad)),
         (200, 220, 255, 255)),
        (fnt_n, dir_txt, c_color),
        (fnt_n, "Amplitud: {}px ({:.1f}%)".format(
            params_crestas['altura_px'], params_crestas['altura_pct']),
         (180, 180, 180, 255)),
    ]
    y = y_base
    for fnt, txt, col in lineas:
        draw.text((margen + 12, y), txt, font=fnt, fill=col)
        y += 24
    
    return Image.alpha_composite(img_rgba, overlay).convert("RGB")


# ─────────────────────────────────────────────────────────────
# API PUBLICA
# ─────────────────────────────────────────────────────────────

def generar_anillo(imagen_bytes, ph, humedad, config=None, agregar_leyenda=True):
    t0 = time.time()
    cfg = config or CONFIG_DEFECTO
    
    ph = max(0.0, min(14.0, float(ph)))
    humedad = max(0.0, min(100.0, float(humedad)))
    
    imagen_base = Image.open(BytesIO(imagen_bytes)).convert("RGB").resize((1024, 1024))
    logger.info("   Imagen cargada: {:.2f}s".format(time.time() - t0))
    
    semilla = int(
        hashlib.md5(imagen_base.tobytes()[:1024]).hexdigest()[:8], 16
    ) % 1000
    
    color_base = _color_por_humedad(humedad)
    palette = _muestrear_palette_local(imagen_base, cfg)
    params = _parametros_crestas(ph, cfg)
    logger.info("   pH={:.1f} dir={} amp={}px".format(ph, params['direccion'], params['altura_px']))
    
    resultado = imagen_base.copy().convert("RGBA")
    capa = Image.new("RGBA", resultado.size, (0, 0, 0, 0))
    
    capa = _dibujar_anillo_ondulado_vec(capa, color_base, palette, cfg, semilla, params, ph)
    logger.info("   Anillo ondulado: {:.2f}s".format(time.time() - t0))
    
    resultado = Image.alpha_composite(resultado, capa).convert("RGB")
    
    if agregar_leyenda:
        color_rep = _color_mezclado_simple(
            color_base, palette.mean(axis=0).astype(int), mezcla=0.52)
        resultado = _agregar_leyenda(resultado, ph, humedad, color_rep, params)
    
    logger.info("   TOTAL: {:.2f}s".format(time.time() - t0))
    
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
