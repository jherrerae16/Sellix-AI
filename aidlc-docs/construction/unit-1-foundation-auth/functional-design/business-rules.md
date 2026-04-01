# Reglas de Negocio — Unit 1: Foundation & Auth

---

## Reglas de Autenticación

| ID | Regla | Razón |
|---|---|---|
| BR-A01 | Las credenciales se validan contra variables de entorno, nunca contra código fuente | SECURITY-12: sin credenciales hardcodeadas |
| BR-A02 | La contraseña se almacena como hash bcrypt en APP_PASSWORD_HASH | SECURITY-12: passwords no guardados en texto plano |
| BR-A03 | Los mensajes de error de login son siempre genéricos: "Credenciales inválidas" | SECURITY-09: no revelar si usuario o contraseña es incorrecto |
| BR-A04 | El sistema NO muestra stack traces ni mensajes de error internos al usuario | SECURITY-09: error hardening |
| BR-A05 | Tras 5 intentos fallidos desde la misma IP → bloqueo de 15 minutos | SECURITY-11: brute-force protection |
| BR-A06 | El contador de intentos se resetea tras un login exitoso | SECURITY-11: evitar bloqueo permanente legítimo |
| BR-A07 | La sesión expira tras 8 horas de inactividad | SECURITY-12: session expiry |
| BR-A08 | La sesión se invalida inmediatamente al hacer logout | SECURITY-12: no reutilizar tokens |

## Reglas de Protección de Rutas

| ID | Regla | Razón |
|---|---|---|
| BR-R01 | TODAS las rutas del dashboard requieren sesión activa | SECURITY-08: deny by default |
| BR-R02 | Único excepción: rutas que empiezan con /auth/* (login) son públicas | SECURITY-08: excepción mínima necesaria |
| BR-R03 | Un usuario no autenticado que accede a /churn es redirigido a /auth/signin, no a un 401 | UX: redirección amigable al login |
| BR-R04 | Tras login exitoso, el usuario es redirigido a la ruta que intentaba acceder | UX: no interrumpir el flujo de trabajo |

## Reglas de Sesión y Cookies

| ID | Regla | Razón |
|---|---|---|
| BR-S01 | La cookie de sesión debe tener atributos: HttpOnly=true, SameSite=Lax, Secure=true | SECURITY-12: protección de cookie |
| BR-S02 | El token JWT no contiene datos sensibles — solo userId y userName | SECURITY-12: mínima exposición |
| BR-S03 | Si el navegador es cerrado y reabierto, la sesión persiste hasta su expiración | UX: sesión tipo "recordar por 8 horas" |

## Reglas de HTTP Security Headers

| Header | Valor requerido | Regla |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` | SECURITY-04 |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | SECURITY-04 |
| X-Content-Type-Options | `nosniff` | SECURITY-04 |
| X-Frame-Options | `DENY` | SECURITY-04 |
| Referrer-Policy | `strict-origin-when-cross-origin` | SECURITY-04 |

*Nota: `unsafe-inline` en styles es necesario para Tailwind CSS en Next.js. Se documenta como excepción justificada.*

## Reglas de Logging

| ID | Regla | Razón |
|---|---|---|
| BR-L01 | Nunca loggear contraseñas, tokens JWT, o datos de cédula | SECURITY-03: sin PII ni secrets en logs |
| BR-L02 | Cada entrada de log incluye: timestamp ISO, nivel, correlationId, mensaje | SECURITY-03: logging estructurado |
| BR-L03 | Eventos de autenticación (éxito, fallo, logout, rate_limited) siempre se loggean | SECURITY-14: alertas de seguridad |
| BR-L04 | Los logs de errores no exponen rutas del sistema operativo, versiones de frameworks, ni queries | SECURITY-09: error hardening |

## Reglas de Dependencias y Supply Chain

| ID | Regla | Razón |
|---|---|---|
| BR-D01 | `package-lock.json` debe ser versionado y commiteado | SECURITY-10: reproducibilidad de builds |
| BR-D02 | No incluir dependencias que no se usen activamente | SECURITY-10: superficie de ataque mínima |
| BR-D03 | Recursos externos (CDN de Google Fonts u otros) deben incluir SRI hash | SECURITY-13 |

## Reglas de Formateo de Datos

| ID | Regla | Aplicación |
|---|---|---|
| BR-F01 | Valores monetarios en COP: formato `$1.500.000` (punto como separador de miles) | Toda la UI |
| BR-F02 | Fechas en formato `DD/MM/YYYY` | Toda la UI |
| BR-F03 | Porcentajes con 1 decimal: `75.6%` | Tablas de confianza |
| BR-F04 | La moneda es siempre COP — no convertir ni mostrar otras divisas | Regla de negocio global |
