# 🌱 Red Agroecológica del Tolima

**Sistema web de cromatografía visual de suelo** — versión de producción.

Convierte fotografías de cromatogramas Pfeiffer en imágenes enriquecidas con
un anillo orgánico que comunica visualmente el pH y la humedad del suelo.

> Aplicación accesible 24/7 desde cualquier navegador, con sistema de cuentas,
> registro de fincas e histórico de muestras por finca. Despliegue **100% gratuito**
> usando tiers free de Vercel, Render, Supabase y Cloudinary.

---

## 🏗️ Arquitectura

```
┌────────────────────────┐         ┌────────────────────────┐
│   FRONTEND             │         │   BACKEND              │
│   React + Vite         │  HTTPS  │   FastAPI + Python     │
│   Tailwind CSS         │ ◄─────► │   Pillow + NumPy       │
│   Vercel (gratis)      │   JWT   │   Render (gratis)      │
└────────────────────────┘         └───────────┬────────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                                 ▼
                       ┌─────────────┐                  ┌──────────────┐
                       │  Supabase   │                  │  Cloudinary  │
                       │  PostgreSQL │                  │   imágenes   │
                       │  + Auth     │                  │   25 GB free │
                       └─────────────┘                  └──────────────┘
```

---

## ✨ Características

### Para el usuario
- 👤 **Registro y login** con email + contraseña
- 🌾 **Múltiples fincas** por usuario con datos de ubicación
- 📸 **Análisis de cromatogramas** con generación del anillo orgánico
- 📚 **Histórico** de todas las muestras por finca
- 🎨 **Tres modos de visualización** (lado a lado, slider, solo final)
- 💾 **Almacenamiento permanente** de imágenes en Cloudinary
- 📱 **Diseño responsive** para móvil y escritorio

### Para el operador del sistema
- 🔒 **Row-Level Security** en Supabase: cada usuario solo ve sus datos
- 🔑 **JWT validation** con tokens de Supabase Auth
- ⚡ **API REST** documentada automáticamente en `/docs`
- 🌐 **CORS configurable** para múltiples dominios
- 📊 **Logs estructurados** para debugging
- 🔄 **Despliegue automático** con cada push a GitHub

---

## 📁 Estructura del proyecto

```
red-agroecologica-prod/
├── backend/                       # FastAPI Python (Render)
│   ├── app/
│   │   ├── core/                  # config, db, auth
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── auth.py
│   │   ├── routers/               # endpoints HTTP
│   │   │   ├── fincas.py
│   │   │   └── muestras.py
│   │   ├── services/              # lógica de negocio
│   │   │   ├── anillo_organico.py # ⭐ algoritmo del anillo
│   │   │   └── cloudinary_service.py
│   │   ├── schemas/               # validación pydantic
│   │   │   └── schemas.py
│   │   └── main.py                # app principal FastAPI
│   ├── requirements.txt
│   ├── render.yaml                # config para Render
│   └── .env.example
│
├── frontend/                      # React + Vite (Vercel)
│   ├── src/
│   │   ├── components/            # UI components
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── CargaImagen.jsx
│   │   │   ├── ControlPh.jsx
│   │   │   ├── ControlHumedad.jsx
│   │   │   ├── SelectorFinca.jsx
│   │   │   ├── VisualizadorResultado.jsx
│   │   │   └── SeccionEducativa.jsx
│   │   ├── pages/                 # rutas
│   │   │   ├── Landing.jsx
│   │   │   ├── IniciarSesion.jsx
│   │   │   ├── Registrarse.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Fincas.jsx
│   │   │   ├── Analizar.jsx
│   │   │   └── MuestraDetalle.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # estado global de auth
│   │   ├── lib/
│   │   │   ├── supabase.js        # cliente Supabase
│   │   │   ├── api.js             # cliente HTTP del backend
│   │   │   └── dominio.js         # validación + estados
│   │   └── App.jsx                # rutas principales
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json                # SPA routing
│   └── .env.example
│
└── docs/
    ├── DESPLIEGUE.md              # ⭐ guía paso a paso
    └── supabase_schema.sql        # SQL de la base de datos
```

---

## 🚀 Despliegue rápido

**Lee la guía completa en `docs/DESPLIEGUE.md`** — son 8 pasos guiados,
~90 minutos la primera vez.

Resumen:

1. Crear cuentas: GitHub, Vercel, Render, Supabase, Cloudinary
2. Crear proyecto Supabase + ejecutar `supabase_schema.sql`
3. Obtener credenciales Supabase y Cloudinary
4. Subir el código a GitHub
5. Desplegar backend en Render (Free plan)
6. Desplegar frontend en Vercel
7. Configurar CORS apuntando a la URL de Vercel
8. ¡Probar!

---

## 💻 Desarrollo local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edita .env con tus credenciales de Supabase y Cloudinary
uvicorn app.main:app --reload
```

API en `http://localhost:8000` · Docs en `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edita .env con la URL del backend y las claves de Supabase
npm run dev
```

App en `http://localhost:5173`

---

## 🛠️ Stack técnico

### Backend
- **Python 3.11+**
- **FastAPI** — framework HTTP moderno con docs automáticas
- **Pydantic v2** — validación de datos tipada
- **Supabase Python Client** — para PostgreSQL y Auth
- **Pillow** — procesamiento de imagen
- **NumPy** — algoritmo del anillo orgánico
- **httpx** — cliente HTTP async (para Cloudinary)
- **uvicorn** — servidor ASGI

### Frontend
- **React 18** — UI declarativa
- **Vite 5** — build ultrarrápido + HMR
- **React Router 6** — navegación entre páginas
- **@supabase/supabase-js** — autenticación cliente
- **Tailwind CSS 3** — estilos utility-first
- **Framer Motion** — animaciones fluidas
- **Lucide React** — iconografía consistente

### Infraestructura
- **Vercel** — hosting frontend
- **Render** — hosting backend Python
- **Supabase** — PostgreSQL + Auth + Row-Level Security
- **Cloudinary** — CDN de imágenes

---

## 🎨 Identidad visual

- **Tipografía display**: Fraunces (serif editorial cálido)
- **Tipografía cuerpo**: Manrope (sans-serif humanista)
- **Tipografía mono**: JetBrains Mono (datos numéricos)
- **Paleta**: tonos tierra, musgo, agua y ámbar
- **Texturas**: grano sutil de papel reciclado
- **Animaciones**: micro-interacciones con Framer Motion

---

## 🔒 Seguridad

- **Autenticación JWT** validada en cada petición al backend
- **Row-Level Security (RLS)** en Supabase: imposible ver datos de otros usuarios
- **CORS estricto**: solo dominios autorizados
- **Validación de tipos** con Pydantic en todos los endpoints
- **Variables de entorno** nunca commiteadas
- **HTTPS** automático en Vercel y Render

---

## 📊 Algoritmo del anillo

El servicio `backend/app/services/anillo_organico.py` contiene el algoritmo
exacto desarrollado en el notebook de Colab:

- **Muestreo de palette local** del cromatograma (720 muestras)
- **Mezcla de azul + tono local** con micro-variación orgánica
- **Borde terrain-like** con 5 octavas de ruido y frecuencias irracionales
- **Sin sawtooth** ni periodicidad detectable
- **Difuminado gaussiano** final para integración natural

---

## 📝 Licencia

Proyecto desarrollado para la **Red Agroecológica del Departamento del Tolima**
en el marco del **Programa Paz y Región**.

---

## 👤 Contacto

- 🌐 Programa Paz y Región
- 🌱 Red Agroecológica del Departamento del Tolima
- 📅 v1.0.0 — Abril 2026

---

**¿Tienes dudas?** Revisa `docs/DESPLIEGUE.md` — incluye troubleshooting de
errores comunes y soluciones probadas.
