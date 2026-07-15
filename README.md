# Sellix AI

Sales intelligence and WhatsApp CRM SaaS for pharmacies in Colombia, built by
**Next AI Tech LLC**.

**Live demo:** https://sellix-ai-mvp.vercel.app

## What it does

Sellix AI turns pharmacy sales data into concrete commercial decisions and turns
WhatsApp into a complete sales channel:

- **Sales dashboard** — KPIs, trends, top products in real time
- **Churn detection** — Flags customers at risk of leaving
- **Refill prediction** — Anticipates when a customer needs their medication again
- **Cross-selling** — Recommends products frequently bought together
- **VIP/RFM segmentation** — Ranks customers by value (VIP, Loyal, Developing, At risk)
- **Loss leaders** — Identifies which products drive foot traffic
- **WhatsApp CRM** — Conversation inbox with a sales funnel
- **Campaign engine** — WhatsApp and email sending with editable templates
- **Price quoter** — Real prices vs. competitors via Google Search
- **Prescription analysis** — Customer sends a photo → AI detects the medications → automatic pricing
- **AI copilot** — Natural-language chat to query system data
- **Next Best Action** — Prioritized actions with estimated revenue impact

## Tech Stack

| Layer | Technology |
|------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Auth | NextAuth v5, JWT, Edge Runtime middleware |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| WhatsApp | Twilio (webhook + sending) |
| Email | Resend |
| AI / Vision | Google Gemini 2.5 Flash (free tier) |
| Database | Redis (Vercel KV / ioredis) |
| ETL | Python, pandas, openpyxl |
| Deploy | Vercel |

## Project structure

```
src/
├── app/                         # Pages and API routes
│   ├── page.tsx                 # Executive summary
│   ├── acciones/                # Next Best Action
│   ├── cotizador/               # Price comparison
│   ├── inbox/                   # WhatsApp CRM
│   ├── churn/                   # Churn risk
│   ├── reposicion/              # Refill prediction
│   ├── cruzada/                 # Cross-selling
│   ├── vip/                     # RFM segmentation
│   ├── gancho/                  # Loss leaders
│   ├── comisiones/              # Next AI Tech panel
│   ├── upload/                  # Data management
│   ├── auth/signin/             # Login
│   └── api/
│       ├── auth/                # NextAuth
│       ├── whatsapp/webhook/    # Receives WhatsApp messages
│       ├── whatsapp/send/       # Sends WhatsApp messages
│       ├── crm/                 # Conversation CRUD
│       ├── campaigns/send/      # Campaign engine
│       ├── campaigns/attribution/ # Attribution + commissions
│       ├── copilot/             # AI chat (Gemini)
│       ├── actions/             # Next Best Action
│       ├── products/search/     # Search + pricing
│       ├── products/generate/   # Generates the price catalog
│       └── upload/              # Excel upload
├── components/
│   ├── auth/                    # Login form
│   ├── cajero/                  # Point-of-sale view
│   ├── campaigns/               # Campaign wrappers
│   ├── charts/                  # 5 visualizations
│   ├── copilot/                 # AI chat
│   ├── inbox/                   # CRM (ChatList, ChatDetail, Funnel)
│   ├── landing/                 # Landing page
│   ├── layout/                  # AppShell, Sidebar, TopBar
│   ├── tables/                  # 5 data tables
│   └── ui/                      # Reusable components
└── lib/
    ├── authConfig.ts            # NextAuth configuration
    ├── types.ts                 # TypeScript interfaces
    ├── dataService.ts           # JSON reading
    ├── crmStore.ts              # Redis persistence
    ├── crmData.ts               # CRM models
    ├── funnelEngine.ts          # Automatic funnel engine
    ├── prescriptionAnalyzer.ts  # Gemini Vision for prescriptions
    ├── campaignTemplates.ts     # Message templates
    ├── formatters.ts            # COP, dates, percentages
    ├── RoleContext.tsx          # Role control
    └── ...
```

> Route and directory names stay in Spanish — they are real paths in the codebase.

## Roles

| Role | Access |
|-----|--------|
| **Admin** | Full dashboard, campaigns, inbox, quoter, upload |
| **Cajero** (cashier) | Simplified view: customer search, cross-selling, refills |
| **Next AI Tech** | Commission and campaign attribution panel |

## Local setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Development server
npm run dev
```

## Environment variables

```env
# Auth
APP_USER=admin
APP_PASSWORD=your_password
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=https://your-app.vercel.app

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxx

# AI (Gemini — free tier)
GEMINI_API_KEY=AIzaSyxxxxxxxxx

# Redis (for CRM on Vercel)
REDIS_URL=redis://default:xxx@xxx

# Demo
DEMO_EMAIL=your@email.com
DEMO_PHONE=whatsapp:+57xxxxxxxxx
COMMISSION_RATE=0.05
```

## Deploy to Vercel

1. Push to GitHub
2. Import into Vercel
3. Add the environment variables
4. Connect KV (Redis) from Storage
5. Configure the Twilio webhook: `https://your-app.vercel.app/api/whatsapp/webhook`

## WhatsApp flow

```
Customer sends message/photo → Twilio → Webhook → Redis
                                                    ↓
Admin sees it in Inbox → Replies → Twilio → Customer's WhatsApp

If a prescription photo is sent:
  → Gemini Vision analyzes it → Extracts medications
  → Looks them up in the catalog → Sends prices to the customer
```

---

*Next AI Tech LLC · Miami, Florida · 2026*
*Pilot customer: Droguería Super Ofertas · Barranquilla, Colombia*
