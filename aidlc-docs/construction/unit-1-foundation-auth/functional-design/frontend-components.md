# Diseño de Componentes Frontend — Unit 1: Foundation & Auth

---

## Jerarquía de Componentes

```
app/layout.tsx (AppShell — Server Component)
├── SessionProvider (Client wrapper para NextAuth)
├── Sidebar (Client Component)
│   ├── NavigationLink × 6 (para cada módulo)
│   └── LogoutButton (Client — llama signOut)
├── TopBar (Client Component)
│   ├── ChurnBadge (contador rojo si > 0)
│   └── UserName (nombre de sesión)
└── {children} (contenido de cada página)

app/auth/signin/page.tsx (LoginPage — Client Component)
├── LoginForm
│   ├── UsernameInput
│   ├── PasswordInput
│   ├── SubmitButton (con loading state)
│   └── ErrorMessage (genérico, sin detalles internos)
└── BrandHeader (logo + nombre Sellix AI)
```

---

## Especificación de Componentes

### AppShell (`app/layout.tsx`)

**Tipo**: Server Component  
**Estado**: Sin estado propio — pasa datos como props

**Datos que carga en servidor**:
- `session` — via `getServerSession(authConfig)`
- `churnCount` — via `DataService.fetchKPIsResumen()` → `.clientes_en_riesgo_alto`

**Props a hijos**:
```typescript
// Sidebar recibe:
{ currentPath: string, userName: string }

// TopBar recibe:
{ churnHighRiskCount: number, userName: string }
```

**Lógica de renderizado**:
- Si `!session` → middleware ya redirigió, este componente no se renderiza
- Si `session` → renderiza layout completo con datos del usuario

---

### Sidebar (`src/components/layout/Sidebar.tsx`)

**Tipo**: Client Component (necesita `usePathname` para estado activo)  
**Estado**: Ninguno propio — recibe todo por props

**Interacciones del usuario**:
1. Clic en enlace de módulo → navegación con Next/Link (prefetch automático)
2. Clic en "Cerrar sesión" → `signOut({ callbackUrl: '/auth/signin' })`

**Items de navegación** (orden en sidebar):
```typescript
const navItems: NavigationItem[] = [
  { label: 'Resumen', href: '/', icon: 'LayoutDashboard' },
  { label: 'Venta Cruzada', href: '/cruzada', icon: 'ShoppingCart' },
  { label: 'Riesgo de Abandono', href: '/churn', icon: 'UserX' },
  { label: 'Reposición Activa', href: '/reposicion', icon: 'RefreshCw' },
  { label: 'Clientes VIP', href: '/vip', icon: 'Star' },
  { label: 'Productos Gancho', href: '/gancho', icon: 'TrendingUp' },
]
```

**Regla visual**:
- Ítem activo: fondo `#185FA5` (azul primario), texto blanco
- Ítem inactivo: fondo transparente, texto gris oscuro, hover con fondo gris claro

---

### TopBar (`src/components/layout/TopBar.tsx`)

**Tipo**: Client Component (necesita interactividad para el badge)  
**Estado**: Sin estado propio

**Elementos**:
1. **Logo/título**: "Sellix AI" a la izquierda
2. **ChurnBadge** (centro-derecha): Si `churnHighRiskCount > 0`:
   - Muestra: `🔴 {count} en riesgo alto`
   - Color: fondo `#E24B4A` (rojo), texto blanco
   - Clic: navega a `/churn?filter=Alto`
   - Si `count === 0`: badge oculto o verde con "Sin alertas"
3. **UserName** (extremo derecho): nombre del usuario de sesión

---

### LoginPage (`app/auth/signin/page.tsx`)

**Tipo**: Client Component  
**Estado**:
```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

**Flujo de interacción**:
1. Usuario escribe usuario y contraseña
2. Clic "Iniciar sesión" → `setIsLoading(true)` → `signIn('credentials', { username, password, redirect: false })`
3. Si `result.error` → `setIsLoading(false)` → `setError('Credenciales inválidas. Intente nuevamente.')`
4. Si `result.ok` → `router.push(callbackUrl || '/')`

**Reglas de UI**:
- El botón muestra spinner mientras `isLoading === true`
- El mensaje de error es siempre el mismo (genérico) — BR-A03
- No mostrar si el error fue usuario vs contraseña
- No mostrar intentos restantes (podría ayudar a atacantes)
- Fondo de página: blanco con card centrada, logo Sellix AI arriba

---

### KPICard (`src/components/ui/KPICard.tsx`)

**Tipo**: Client Component  
**Props**:
```typescript
interface KPICardProps {
  label: string
  value: number | string
  format: 'cop' | 'number' | 'percent' | 'raw'
  variant?: 'default' | 'warning' | 'danger'
  onClick?: () => void
}
```

**Lógica de formato**:
- `cop` → `formatCOP(value)` → `"$1.500.000"`
- `number` → `value.toLocaleString('es-CO')`
- `percent` → `formatPercent(value)`
- `raw` → `value.toString()`

**Lógica de color**:
- `default` → borde gris, texto oscuro
- `warning` → borde ámbar `#EF9F27`
- `danger` → borde rojo `#E24B4A`, fondo rojo muy claro
- Si tiene `onClick` → cursor pointer, hover con sombra

---

### RiskBadge (`src/components/ui/RiskBadge.tsx`)

**Tipo**: Client Component puro (sin estado)  
**Mapeo de nivel a color**:
```typescript
const levelStyles = {
  'Alto':         { bg: '#E24B4A', text: 'white' },
  'Medio':        { bg: '#EF9F27', text: 'white' },
  'Bajo':         { bg: '#3B6D11', text: 'white' },
  'Vencido':      { bg: '#E24B4A', text: 'white' },
  'Esta semana':  { bg: '#EF9F27', text: 'white' },
  'Próximo mes':  { bg: '#3B6D11', text: 'white' },
}
```

---

### ExportButton (`src/components/ui/ExportButton.tsx`)

**Tipo**: Client Component  
**Lógica de exportación**:
1. `handleExport()` → generar CSV string con BOM UTF-8 (`\uFEFF`)
2. Crear `Blob` con `type: 'text/csv;charset=utf-8'`
3. `URL.createObjectURL(blob)` → crear link temporal
4. `link.click()` → disparar descarga
5. `URL.revokeObjectURL(url)` → liberar memoria

**Formato de filas CSV**:
- Encabezados: valores de `columns[].header`
- Valores: escapados con comillas dobles si contienen comas
- Separador: coma (`,`)

---

## Flujos de Navegación

```
/auth/signin (público)
    └── Login exitoso → / (Resumen Ejecutivo)

/ (protegido)
/cruzada (protegido)
/churn (protegido)        ← TopBar badge → /churn?filter=Alto
/reposicion (protegido)
/vip (protegido)
/gancho (protegido)
    └── Sesión expirada → /auth/signin
    └── Logout → /auth/signin
```
