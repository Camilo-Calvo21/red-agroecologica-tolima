# 🚀 Guía de despliegue — Red Agroecológica del Tolima

Esta guía te lleva paso a paso a tener la aplicación funcionando en internet,
**100% gratis**, accesible desde cualquier navegador del mundo.

**Tiempo estimado total: 60–90 minutos** (la primera vez).

---

## 📋 Resumen del despliegue

```
GitHub (código) ──────────────┐
                              │
      ┌───────────────────────┴───────────────────────┐
      │                                               │
      ▼                                               ▼
   Vercel                                          Render
   (Frontend)                                    (Backend Python)
      │                                               │
      ├──→ tu-app.vercel.app                         │
      │                                              │
      └─────────────► API ◄──────────────────────────┘
                       │
                       ▼
            ┌──────────┴──────────┐
            ▼                     ▼
       Supabase              Cloudinary
   (BD + login)         (almacén imágenes)
```

---

## 🏗️ Paso 1 — Crear cuentas (15 min)

Necesitas estas 4 cuentas, **todas gratuitas**:

| Servicio | Para qué | URL de registro |
|---|---|---|
| **GitHub** | Guardar el código | https://github.com/signup |
| **Vercel** | Desplegar el frontend | https://vercel.com/signup |
| **Render** | Desplegar el backend | https://render.com/register |
| **Supabase** | Base de datos + login | https://supabase.com |
| **Cloudinary** | Imágenes | https://cloudinary.com/users/register/free |

**Tip:** En Vercel y Render, regístrate con tu cuenta de GitHub — así se conectan automáticamente.

---

## 🗄️ Paso 2 — Configurar Supabase (10 min)

### 2.1 Crear el proyecto

1. Entra a https://supabase.com/dashboard
2. Clic en **"New Project"**
3. Llena:
   - **Name**: `red-agroecologica-tolima`
   - **Database password**: invéntala fuerte y **GUÁRDALA** en un sitio seguro (no la verás de nuevo)
   - **Region**: `South America (São Paulo)`
4. Clic en **"Create new project"** y espera 2 minutos

### 2.2 Crear las tablas

1. En el menú izquierdo, clic en **"SQL Editor"**
2. Clic en **"New query"**
3. Abre el archivo `docs/supabase_schema.sql` de este proyecto
4. **Copia TODO su contenido** y pégalo en el editor de Supabase
5. Clic en **"Run"** (o `Ctrl+Enter`)
6. Verás `Success. No rows returned` — perfecto

### 2.3 Configurar la autenticación

1. Menú izquierdo → **"Authentication"** → **"Providers"**
2. Asegúrate de que **"Email"** esté activado
3. Si quieres simplificar para los miembros de la Red:
   - Desactiva **"Confirm email"** (Settings → Auth → "Email confirmation" OFF)
   - Esto permite que se registren y entren al instante (recomendado para MVP)

### 2.4 Copiar las credenciales

Menú → **"Project Settings"** → **"API"**

Copia y guarda **TRES** valores en un bloc de notas:

```
SUPABASE_URL          = https://xxxxx.supabase.co       ← URL en la parte superior
SUPABASE_ANON_KEY     = eyJhbGc...                       ← anon · public
SUPABASE_SERVICE_KEY  = eyJhbGc...                       ← service_role · secret
```

⚠ **El SERVICE_KEY es secreto** — nunca lo subas a GitHub ni lo compartas.

Adicionalmente, en **"JWT Settings"** copia:

```
SUPABASE_JWT_SECRET   = xxxxxxx
```

---

## 📸 Paso 3 — Configurar Cloudinary (3 min)

1. Una vez registrado, vas al **Dashboard**
2. En la parte superior verás **"Product Environment Credentials"**
3. Copia los 3 valores:

```
CLOUDINARY_CLOUD_NAME  = tu-cloud-name
CLOUDINARY_API_KEY     = 123456789012345
CLOUDINARY_API_SECRET  = ABCxyz_secreto_largo
```

---

## 📤 Paso 4 — Subir el código a GitHub (10 min)

### 4.1 Crear el repositorio

1. https://github.com/new
2. **Repository name**: `red-agroecologica-tolima`
3. **Public** o **Private** (cualquiera funciona)
4. **NO marques** "Initialize this repository with README"
5. Clic en **"Create repository"**

### 4.2 Subir el código

Desde tu computador, abre PowerShell y ejecuta (reemplazando `tu-usuario`):

```powershell
cd C:\ruta\donde\descomprimiste\red-agroecologica-prod

git init
git add .
git commit -m "Versión inicial — MVP producción"
git branch -M main
git remote add origin https://github.com/tu-usuario/red-agroecologica-tolima.git
git push -u origin main
```

Si te pide login, usa tu usuario de GitHub. Para el password, GitHub ya no acepta
contraseñas — necesitas un **Personal Access Token**:

1. https://github.com/settings/tokens
2. **Generate new token (classic)** → marca solo "repo" → **Generate**
3. Copia el token (empieza con `ghp_`) y úsalo como password en `git push`

---

## ⚙️ Paso 5 — Desplegar el backend en Render (15 min)

### 5.1 Crear el servicio

1. https://dashboard.render.com
2. Clic en **"New +"** → **"Web Service"**
3. Conecta tu cuenta de GitHub si no está conectada
4. Busca y selecciona el repositorio **`red-agroecologica-tolima`**
5. Configura así:

| Campo | Valor |
|---|---|
| **Name** | `red-agroecologica-api` |
| **Root Directory** | `backend` |
| **Environment** | `Python 3` |
| **Region** | `Oregon (US West)` |
| **Branch** | `main` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | **`Free`** ⚠ |

### 5.2 Variables de entorno

**Antes de hacer deploy**, baja a la sección **"Advanced"** → **"Add Environment Variable"** y agrega cada una:

```
ENV                       = production
DEBUG                     = false
SUPABASE_URL              = (el valor que guardaste)
SUPABASE_ANON_KEY         = (el valor que guardaste)
SUPABASE_SERVICE_KEY      = (el valor que guardaste)
SUPABASE_JWT_SECRET       = (el valor que guardaste)
CLOUDINARY_CLOUD_NAME     = (el valor que guardaste)
CLOUDINARY_API_KEY        = (el valor que guardaste)
CLOUDINARY_API_SECRET     = (el valor que guardaste)
CORS_ORIGINS              = http://localhost:5173
```

(El `CORS_ORIGINS` lo actualizarás después con la URL de Vercel)

### 5.3 Deploy

1. Clic en **"Create Web Service"**
2. Render empieza a construir — verás logs en vivo. Tarda **5–8 minutos**
3. Cuando veas `Your service is live` y el estado en verde, copia la URL:

```
https://red-agroecologica-api.onrender.com
```

### 5.4 Verificar

Abre en el navegador:

```
https://red-agroecologica-api.onrender.com/health
```

Deberías ver:
```json
{
  "status": "ok",
  "service": "cromatografia-anillo-organico",
  "version": "1.0.0",
  "env": "production"
}
```

✅ Backend funcionando.

---

## 🎨 Paso 6 — Desplegar el frontend en Vercel (10 min)

### 6.1 Importar el proyecto

1. https://vercel.com/new
2. Conecta GitHub si no está conectado
3. Busca **`red-agroecologica-tolima`** y clic **"Import"**
4. Configura:

| Campo | Valor |
|---|---|
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 6.2 Variables de entorno

Antes de desplegar, expande **"Environment Variables"** y agrega:

```
VITE_API_URL          = https://red-agroecologica-api.onrender.com
VITE_SUPABASE_URL     = (el valor que guardaste)
VITE_SUPABASE_ANON_KEY= (el valor que guardaste)
```

### 6.3 Deploy

1. Clic en **"Deploy"**
2. Espera 2–3 minutos
3. ¡Listo! Verás algo como:

```
https://red-agroecologica-tolima.vercel.app
```

---

## 🔁 Paso 7 — Conectar todo (3 min)

Ahora que tienes la URL de Vercel, vuelve a Render y actualiza CORS:

1. https://dashboard.render.com → tu servicio
2. **"Environment"** → busca `CORS_ORIGINS`
3. Cambia el valor a:

```
http://localhost:5173,https://red-agroecologica-tolima.vercel.app
```

(Pon tu URL real de Vercel)

4. Render redespliega automáticamente.

---

## 🎉 Paso 8 — Probar la aplicación

1. Abre tu URL de Vercel
2. Clic en **"Registrarse"**
3. Crea tu primera cuenta
4. Crea una finca
5. Sube un cromatograma + valores de pH y humedad
6. ¡Disfruta del resultado!

⚠ **Primera vez en el día**: el backend de Render duerme tras 15 min sin uso.
La primera petición tarda **30–50 segundos** mientras despierta. Después
funciona normal. Es la limitación esperada del tier gratis.

---

## 🔧 Mantenimiento

### Actualizar el código

Cualquier `git push` a `main` redespliega automáticamente Vercel y Render.

```bash
git add .
git commit -m "Mensaje"
git push
```

### Ver logs

- **Backend**: Render → tu servicio → "Logs"
- **Frontend**: Vercel → tu proyecto → "Deployments" → clic en uno → "Function Logs"
- **Base de datos**: Supabase → "Logs"

### Si algo deja de funcionar

1. Revisa los logs de Render por errores
2. Verifica que las variables de entorno sigan correctas
3. Verifica que CORS incluya la URL de Vercel
4. Reinicia el servicio en Render → "Manual Deploy" → "Deploy latest commit"

---

## 💰 Costos reales

| Servicio | Tier usado | Costo |
|---|---|---|
| GitHub | Free | $0 |
| Vercel | Hobby (free) | $0 |
| Render | Free Web Service | $0 |
| Supabase | Free | $0 |
| Cloudinary | Free | $0 |
| **TOTAL** | | **$0/mes** |

### Limitaciones del tier gratis

- **Render**: el backend se duerme tras 15 min sin uso (despierta en 30-50 seg)
- **Supabase**: 500 MB de base de datos (suficiente para ~50 mil muestras)
- **Cloudinary**: 25 GB de imágenes y 25 GB de bandwidth/mes
- **Vercel**: 100 GB de bandwidth/mes (más que suficiente)

Si la Red crece y necesitas un servidor que nunca duerma, Render Pro cuesta $7/mes.

---

## ❓ Solución de problemas comunes

**"CORS error" en el navegador**
→ El frontend no está en la lista CORS_ORIGINS del backend. Actualiza la
variable en Render incluyendo la URL exacta de Vercel.

**"Token inválido o expirado"**
→ La sesión expiró. Cierra sesión y vuelve a entrar.

**"Module not found" en Render durante el build**
→ Falta una dependencia en `requirements.txt`. Agrégala y haz `git push`.

**El backend no arranca**
→ Revisa los logs de Render. Lo más común: variables de entorno mal configuradas
(typo, falta una, etc).

**Cloudinary no sube imágenes**
→ Verifica que las 3 credenciales estén bien copiadas (sin espacios al inicio/final).

---

## 📞 Próximos pasos opcionales

- **Dominio personalizado** — Vercel permite conectar `cromatografia-tolima.org`
  o similar gratis. Necesitas comprar el dominio aparte (~$12/año).
- **Notificaciones por email** cuando se procesa una muestra
- **Exportar reportes** PDF por finca
- **Compartir muestras** con otros miembros de la Red

---

**Listo. Tu app está en producción, gratis, accesible desde cualquier parte del mundo. 🌱**
