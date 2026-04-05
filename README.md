# Sellix AI

Plataforma SaaS de inteligencia comercial y CRM por WhatsApp para droguerías en Colombia, desarrollada por **Next AI Tech LLC**.

**Demo en producción:** https://sellix-ai-mvp.vercel.app

## Qué hace

Sellix AI transforma datos de ventas de farmacias en decisiones comerciales concretas y convierte WhatsApp en un canal completo de ventas:

- **Dashboard de ventas** — KPIs, tendencias, top productos en tiempo real
- **Detección de churn** — Identifica clientes en riesgo de abandono
- **Predicción de reposición** — Anticipa cuándo el cliente necesita su medicamento
- **Venta cruzada** — Recomendaciones de productos que se compran juntos
- **Segmentación VIP/RFM** — Clasifica clientes por valor (VIP, Leal, En desarrollo, En riesgo)
- **Productos gancho** — Identifica qué productos generan tráfico
- **CRM WhatsApp** — Inbox de conversaciones con embudo de ventas
- **Motor de campañas** — Envío de WhatsApp y email con plantillas editables
- **Cotizador de precios** — Precios reales vs competencia vía Google Search
- **Análisis de recetas** — El cliente envía foto de receta → IA detecta medicamentos → precios automáticos
- **Copiloto IA** — Chat en lenguaje natural para consultar datos del sistema
- **Next Best Action** — Acciones priorizadas con impacto estimado en ingresos

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Auth | NextAuth v5, JWT, Edge Runtime middleware |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| WhatsApp | Twilio (webhook + envío) |
| Email | Resend |
| IA / Vision | Google Gemini 2.5 Flash (gratis) |
| Base de datos | Redis (Vercel KV / ioredis) |
| ETL | Python, pandas, openpyxl |
| Deploy | Vercel |

## Estructura del Proyecto

```
src/
├── app/                         # Páginas y API routes
│   ├── page.tsx                 # Resumen Ejecutivo
│   ├── acciones/                # Next Best Action
│   ├── cotizador/               # Comparador de precios
│   ├── inbox/                   # CRM WhatsApp
│   ├── churn/                   # Riesgo de abandono
│   ├── reposicion/              # Predicción de reposición
│   ├── cruzada/                 # Venta cruzada
│   ├── vip/                     # Segmentación RFM
│   ├── gancho/                  # Productos gancho
│   ├── comisiones/              # Panel Next AI Tech
│   ├── upload/                  # Gestión de datos
│   ├── auth/signin/             # Login
│   └── api/
│       ├── auth/                # NextAuth
│       ├── whatsapp/webhook/    # Recibe mensajes WhatsApp
│       ├── whatsapp/send/       # Envía mensajes WhatsApp
│       ├── crm/                 # CRUD conversaciones
│       ├── campaigns/send/      # Motor de campañas
│       ├── campaigns/attribution/ # Atribución + comisiones
│       ├── copilot/             # Chat IA (Gemini)
│       ├── actions/             # Next Best Action
│       ├── products/search/     # Búsqueda + precios
│       ├── products/generate/   # Genera catálogo de precios
│       └── upload/              # Upload de Excel
├── components/
│   ├── auth/                    # Login form
│   ├── cajero/                  # Vista punto de venta
│   ├── campaigns/               # Wrappers de campañas
│   ├── charts/                  # 5 visualizaciones
│   ├── copilot/                 # Chat IA
│   ├── inbox/                   # CRM (ChatList, ChatDetail, Funnel)
│   ├── landing/                 # Landing page
│   ├── layout/                  # AppShell, Sidebar, TopBar
│   ├── tables/                  # 5 tablas de datos
│   └── ui/                      # Componentes reutilizables
└── lib/
    ├── authConfig.ts            # Configuración NextAuth
    ├── types.ts                 # TypeScript interfaces
    ├── dataService.ts           # Lectura de JSON
    ├── crmStore.ts              # Persistencia Redis
    ├── crmData.ts               # Modelos CRM
    ├── funnelEngine.ts          # Motor automático del embudo
    ├── prescriptionAnalyzer.ts  # Gemini Vision para recetas
    ├── campaignTemplates.ts     # Plantillas de mensajes
    ├── formatters.ts            # COP, fechas, porcentajes
    ├── RoleContext.tsx          # Control de roles
    └── ...
```

## Roles

| Rol | Acceso |
|-----|--------|
| **Admin** | Dashboard completo, campañas, inbox, cotizador, upload |
| **Cajero** | Vista simplificada: búsqueda de clientes, venta cruzada, reposición |
| **Next AI Tech** | Panel de comisiones y atribución de campañas |

## Setup Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales

# Servidor de desarrollo
npm run dev
```

## Variables de Entorno

```env
# Auth
APP_USER=admin
APP_PASSWORD=tu_contraseña
NEXTAUTH_SECRET=genera_con_openssl_rand_base64_32
NEXTAUTH_URL=https://tu-app.vercel.app

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxx

# IA (Gemini — gratis)
GEMINI_API_KEY=AIzaSyxxxxxxxxx

# Redis (para CRM en Vercel)
REDIS_URL=redis://default:xxx@xxx

# Demo
DEMO_EMAIL=tu@email.com
DEMO_PHONE=whatsapp:+57xxxxxxxxx
COMMISSION_RATE=0.05
```

## Deploy a Vercel

1. Push a GitHub
2. Importar en Vercel
3. Agregar variables de entorno
4. Conectar KV (Redis) desde Storage
5. Configurar webhook de Twilio: `https://tu-app.vercel.app/api/whatsapp/webhook`

## Flujo WhatsApp

```
Cliente envía mensaje/foto → Twilio → Webhook → Redis
                                                    ↓
Admin ve en Inbox → Responde → Twilio → WhatsApp del cliente

Si envía foto de receta:
  → Gemini Vision analiza → Extrae medicamentos
  → Busca en catálogo → Envía precios al cliente
```

---

*Next AI Tech LLC · Miami, Florida · 2026*
*Cliente piloto: Droguería Super Ofertas · Barranquilla, Colombia*
