# Instrucciones de Build — Sellix AI

## Prerrequisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20.x LTS |
| npm | 10.x |
| Python | 3.11+ |
| pip | 23+ |

---

## 1. Clonar / preparar el workspace

```bash
cd /Users/jdh/Desktop/SellixAI-MVP
```

---

## 2. Instalar dependencias Node.js

```bash
npm ci
```

> `npm ci` usa `package-lock.json` exacto — garantiza reproducibilidad (SECURITY-10).

---

## 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Completar `.env.local` con:

```bash
# Generar NEXTAUTH_SECRET
openssl rand -base64 32

# Generar hash de contraseña
node -e "const b=require('bcryptjs'); b.hash('TU_CONTRASEÑA', 12).then(console.log)"
```

Ejemplo de `.env.local` completo:
```env
NEXTAUTH_SECRET=<valor de openssl>
NEXTAUTH_URL=http://localhost:3000
APP_USER=admin
APP_PASSWORD_HASH=<hash de bcryptjs>
```

---

## 4. Ejecutar el ETL Python

```bash
# Instalar dependencias Python
pip install -r scripts/requirements.txt

# Colocar archivos Excel:
# data/raw/Ventas_Superofertas.xlsx
# data/raw/Remisiones_Mayo_Octubre_Superofertas.xlsx

# Ejecutar ETL
python scripts/etl.py
```

Verificar que se generaron los 8 JSON en `public/data/`:
```
public/data/
├── kpis_resumen.json      ← objeto único
├── ventas_mensuales.json  ← array []
├── top_productos.json     ← array []
├── ventas_cruzadas.json   ← array []
├── churn_clientes.json    ← array []
├── reposicion_pendiente.json  ← array []
├── clientes_rfm.json      ← array []
└── productos_gancho.json  ← array []
```

---

## 5. Build de producción

```bash
npm run build
```

Build exitoso produce:
- Route `/` — RSC (Server Component)
- Route `/cruzada` — RSC
- Route `/churn` — RSC
- Route `/reposicion` — RSC
- Route `/vip` — RSC
- Route `/gancho` — RSC
- Route `/auth/signin` — Client Component
- Route `/api/auth/[...nextauth]` — API Route
- Middleware edge — `src/middleware.ts`

---

## 6. Modo desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000 → redirige a `/auth/signin`.

---

## 7. Despliegue a Vercel (producción)

```bash
# Instalar Vercel CLI (una sola vez)
npm i -g vercel

# Deploy de producción
vercel deploy --prod
```

Configurar en Vercel Dashboard → Settings → Environment Variables:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (https://tu-proyecto.vercel.app)
- `APP_USER`
- `APP_PASSWORD_HASH`

**IMPORTANTE**: Los archivos JSON generados por el ETL (`public/data/*.json`) deben estar presentes en el repositorio o subidos antes del deploy. El ETL se ejecuta localmente.
