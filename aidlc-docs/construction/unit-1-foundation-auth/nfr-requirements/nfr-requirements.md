# Requerimientos No Funcionales — Unit 1: Foundation & Auth

---

## Rendimiento
| ID | Requisito | Criterio de aceptación |
|---|---|---|
| PERF-01 | Carga inicial del dashboard | Página principal carga en < 3 segundos en conexión 4G (Vercel CDN, HTML pre-renderizado) |
| PERF-02 | Respuesta del login | El formulario de login responde en < 2 segundos (Vercel Serverless Function) |
| PERF-03 | Navegación entre módulos | Transición entre páginas < 500ms (Next.js prefetch activado) |
| PERF-04 | Carga de JSON | Cada archivo JSON se entrega desde CDN en < 200ms (archivos < 2MB) |

## Disponibilidad
| ID | Requisito | Criterio de aceptación |
|---|---|---|
| AVAIL-01 | Uptime | 99.5% mensual — garantizado por SLA de Vercel |
| AVAIL-02 | Recuperación de errores | Si falla la carga de un JSON, el componente muestra estado vacío sin romper la página |

## Seguridad (SECURITY rules — BLOQUEANTES)
| Regla | Requisito | Implementación |
|---|---|---|
| SECURITY-03 | Logging estructurado sin PII | `logger.ts` con campos controlados |
| SECURITY-04 | HTTP Security Headers | `next.config.ts` → headers globales |
| SECURITY-05 | Validación de inputs | Formulario de login valida campos no vacíos, longitud máxima |
| SECURITY-08 | Control de acceso por aplicación | `middleware.ts` → deny by default |
| SECURITY-09 | Hardening | Errores genéricos; sin stack traces en respuestas |
| SECURITY-10 | Supply chain | `package-lock.json` versionado; sin deps sin uso |
| SECURITY-11 | Rate limiting | 5 intentos → bloqueo 15 min por IP |
| SECURITY-12 | Gestión de credenciales | bcrypt hash; cookie HttpOnly+SameSite+Secure; expiración 8h |
| SECURITY-13 | Integridad de software | SRI en recursos externos de CDN |
| SECURITY-14 | Alertas y monitoreo | Auth events loggeados; Vercel Logs como destino |
| SECURITY-15 | Manejo de excepciones | Global error handler en `app/error.tsx`; fail-closed en auth |

## Usabilidad
| ID | Requisito | Criterio |
|---|---|---|
| USA-01 | Idioma | 100% español colombiano en toda la UI |
| USA-02 | Sin capacitación | Usuario no técnico navega sin asistencia |
| USA-03 | Responsive | Optimizado para desktop (1280px+) y tablet (768px+) |
| USA-04 | Sin dark mode | Solo tema claro en Fase 1 |

## Mantenibilidad
| ID | Requisito | Criterio |
|---|---|---|
| MANT-01 | TypeScript estricto | `strict: true` en tsconfig.json |
| MANT-02 | Sin dependencias sin uso | Validar con `depcheck` antes del deploy |
| MANT-03 | Variables de entorno documentadas | `.env.local.example` con todas las variables requeridas |
