# Servicios de la Aplicación — Sellix AI

**Patrón de servicios**: Capa delgada de orquestación. Los servicios no contienen lógica de negocio — esta reside en el ETL (Python) y en los componentes de presentación. Los servicios gestionan acceso a datos, autenticación y exportación.

---

## DataService (Client-side)

**Archivo**: `src/lib/dataService.ts`  
**Patrón**: Fetch estático con caché SSG de Next.js  
**Propósito**: Centralizar el acceso a los 8 archivos JSON de `public/data/`

### Responsabilidades
- Proveer una función de fetch tipada por cada JSON del dashboard
- Aplicar `cache: 'force-cache'` para SSG (los datos no cambian entre deploys)
- Manejar errores de fetch y retornar arrays vacíos o estructuras por defecto seguros
- Loggear errores de carga sin exponer rutas internas al cliente (SECURITY-09, SECURITY-15)

### Interacciones
- **Consumidores**: Todas las Server Components de páginas (DashboardPage, ChurnPage, etc.)
- **Fuente de datos**: `public/data/*.json` (archivos estáticos servidos por Vercel)
- **No tiene dependencias** en tiempo de ejecución — solo fetch nativo

```
DataService
    │
    ├── fetchKPIsResumen()      → public/data/kpis_resumen.json
    ├── fetchVentasMensuales()  → public/data/ventas_mensuales.json
    ├── fetchTopProductos()     → public/data/top_productos.json
    ├── fetchVentasCruzadas()   → public/data/ventas_cruzadas.json
    ├── fetchChurnClientes()    → public/data/churn_clientes.json
    ├── fetchReposicionActiva() → public/data/reposicion_activa.json
    ├── fetchSegmentacionRFM()  → public/data/segmentacion_rfm.json
    └── fetchProductosGancho()  → public/data/productos_gancho.json
```

---

## AuthService (Server-side)

**Archivos**: `src/lib/authConfig.ts` + `src/app/api/auth/[...nextauth]/route.ts`  
**Framework**: NextAuth.js v5  
**Propósito**: Gestionar autenticación, sesión y cierre de sesión de forma segura

### Responsabilidades
- Configurar CredentialsProvider con validación de usuario/contraseña desde variables de entorno
- Gestionar sesiones con expiración configurable (8h por defecto)
- Emitir cookies seguras (HttpOnly, SameSite, Secure) — SECURITY-12
- Proveer callbacks de sesión para incluir datos del usuario en el token JWT
- Redirigir al login cuando la sesión expira o no existe
- Loggear eventos de autenticación (éxito, fallo, logout) — SECURITY-14

### Integración con RateLimiter
- El endpoint de login (`/api/auth/callback/credentials`) consulta RateLimiterService antes de validar credenciales
- Si la IP está bloqueada, retorna error sin intentar validar (SECURITY-11)

### Interacciones
- **Consumidores**: LoginPage (signIn), Sidebar (signOut), middleware.ts (getServerSession)
- **Dependencias**: NextAuth.js, rateLimiter.ts, logger.ts
- **Variables de entorno**: NEXTAUTH_SECRET, NEXTAUTH_URL, APP_USER, APP_PASSWORD_HASH

```
AuthService
    │
    ├── authorize(credentials)     → Valida contra env vars + rate limiter
    ├── getServerSession()         → Verifica sesión activa en Server Components
    ├── signIn()                   → Llamado desde LoginPage
    ├── signOut()                  → Llamado desde Sidebar
    └── session callbacks          → Incluye userName en token JWT
```

---

## RateLimiterService (Server-side)

**Archivo**: `src/lib/rateLimiter.ts`  
**Propósito**: Prevenir ataques de brute-force en el endpoint de login — SECURITY-11

### Responsabilidades
- Rastrear intentos fallidos de login por IP en memoria
- Bloquear temporalmente (15 min) tras 5 intentos fallidos consecutivos
- Resetear contador tras login exitoso
- Loggear eventos de rate limiting — SECURITY-14

### Interacciones
- **Consumidor único**: AuthService.authorize()
- **Store**: Map en memoria (suficiente para MVP single-instance en Vercel)

---

## ExportService (Client-side)

**Archivo**: Integrado en el componente ExportButton  
**Propósito**: Generar y descargar archivos CSV desde los datos de las tablas — NFR-005

### Responsabilidades
- Recibir datos tabulares y definición de columnas
- Generar CSV con separador de comas y codificación UTF-8 con BOM (para compatibilidad con Excel en español)
- Disparar descarga del archivo mediante Blob + URL.createObjectURL
- Respetar el filtro activo en la tabla en el momento de la exportación

### Interacciones
- **Consumidores**: ChurnTable, ReposicionTable
- **Sin dependencias de red** — procesamiento 100% en el cliente

---

## LoggingService (Universal)

**Archivo**: `src/lib/logger.ts`  
**Propósito**: Logging estructurado en servidor y cliente — SECURITY-03

### Responsabilidades
- Proveer interfaz única de logging con niveles (info, warn, error)
- Incluir en cada entrada: timestamp ISO, correlationId, nivel, mensaje, contexto
- Garantizar que no se loggeen datos sensibles (PII, tokens, contraseñas) — SECURITY-03
- En servidor: escribir a stdout (capturado por Vercel Logs)
- En cliente: usar console con nivel apropiado (sin datos sensibles)
- Loggear eventos críticos de seguridad: login_success, login_failure, logout, rate_limited

### Interacciones
- **Consumidores**: AuthService, RateLimiterService, DataService (errores), global error handler

---

## ETLPipelineService (Python standalone)

**Archivo**: `scripts/etl.py`  
**Propósito**: Orquestar el procesamiento completo de datos Excel → JSON

### Responsabilidades
- Cargar archivos Excel con pandas y validar integridad
- Coordinar la ejecución secuencial de los 8 calculadores de módulos
- Manejar errores por módulo de forma aislada (un módulo fallido no detiene los demás)
- Escribir todos los JSON de output en `public/data/`
- Proveer logging de progreso con timestamps y conteo de registros
- Retornar código de salida 0 (éxito total) o distinto de 0 (algún módulo falló)

### Flujo de orquestación
```
main()
  │
  ├── 1. load_data()                    → ventas_df, remisiones_df
  ├── 2. resumen_calidad_datos()        → print + validación bloqueante
  ├── 3. calculate_kpis()               → export_json("kpis_resumen.json")
  ├── 4. calculate_ventas_mensuales()   → export_json("ventas_mensuales.json")
  ├── 5. calculate_top_productos()      → export_json("top_productos.json")
  ├── 6. calculate_ventas_cruzadas()    → export_json("ventas_cruzadas.json")
  ├── 7. calculate_churn()              → export_json("churn_clientes.json")
  ├── 8. calculate_reposicion()         → export_json("reposicion_activa.json")
  ├── 9. calculate_rfm()                → export_json("segmentacion_rfm.json")
  ├── 10. calculate_gancho()            → export_json("productos_gancho.json")
  └── 11. print_summary()               → Lista archivos generados + tamaños
```

### Interacciones
- **Input**: `data/raw/Ventas_Superofertas.xlsx`, `data/raw/Remisiones_Mayo_Octubre_Superofertas.xlsx`
- **Output**: 8 archivos JSON en `public/data/`
- **Dependencias**: pandas 2.x, openpyxl, datetime, json, logging, pathlib
- **Sin conexión de red** — procesamiento 100% local
