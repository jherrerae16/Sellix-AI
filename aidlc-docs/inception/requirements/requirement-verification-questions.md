# Preguntas de Verificación de Requerimientos
## Sellix AI — Plataforma de Inteligencia de Ventas

El PRD está muy completo. Las siguientes preguntas cubren áreas no especificadas en el documento que impactan directamente las decisiones de implementación.

Por favor responde cada pregunta escribiendo la letra de tu elección después del tag `[Answer]:`.
Si ninguna opción aplica, elige la última opción (Other/Otro) y describe tu respuesta.

---

## Pregunta 1 — Alcance de construcción para este sprint

El PRD define Fase 1 (Módulos 1.1–1.4) y Fase 2 (Módulos 2.1–2.2). ¿Qué alcance deseas construir en esta sesión de AI-DLC?

A) Solo Fase 1 — Módulos 1.1 Resumen Ejecutivo, 1.2 Venta Cruzada, 1.3 Riesgo de Abandono, 1.4 Retención Activa
B) Fase 1 + Fase 2 completas — Los 6 módulos del PRD (1.1 al 2.2)
C) Otro (describe después del tag [Answer]:)

[Answer]: B

---

## Pregunta 2 — Archivos Excel de datos

El ETL (`scripts/etl.py`) requiere los archivos `Ventas_Superofertas.xlsx` y `Remisiones_Mayo_Octubre_Superofertas.xlsx` en `data/raw/`. ¿Cuál es su estado actual?

A) Los archivos Excel ya están disponibles y los pondré en `data/raw/` antes de ejecutar el ETL
B) No tengo los archivos aún — necesito que el ETL funcione con datos de muestra/dummy para desarrollo y pruebas
C) Tengo los archivos en otra ubicación — los movería cuando sea necesario
D) Otro (describe después del tag [Answer]:)

[Answer]: C

---

## Pregunta 3 — Plataforma de despliegue

¿Dónde se desplegará la aplicación Next.js en producción?

A) Vercel (plataforma nativa de Next.js — sin configuración adicional)
B) Netlify
C) Servidor propio / VPS (Linux)
D) AWS (Amplify, S3+CloudFront, EC2, u otro servicio AWS)
E) Otro (describe después del tag [Answer]:)

[Answer]: A

---

## Pregunta 4 — Autenticación en Fase 1

El PRD marca autenticación como "NFR-006 — Fase 1.5" y fuera del alcance de Fase 1. ¿Deseas incluir autenticación básica en esta implementación de todas formas?

A) No incluir autenticación — el dashboard será de acceso libre en la URL desplegada (MVP interno)
B) Sí, incluir autenticación básica (usuario/contraseña única para toda la droguería) usando NextAuth.js
C) Otro (describe después del tag [Answer]:)

[Answer]: B

---

## Pregunta 5 — Repositorio Git y CI/CD

¿Cómo gestionarás el código fuente y el despliegue continuo?

A) GitHub + despliegue manual (push a main → despliegue manual en plataforma)
B) GitHub + CI/CD automático vía GitHub Actions
C) Sin repositorio remoto por ahora — solo desarrollo local
D) Otro (describe después del tag [Answer]:)

[Answer]: C

---

## Pregunta 6 — Reglas de seguridad (Security Extension)

¿Deben aplicarse las reglas de seguridad SECURITY-01 a SECURITY-15 como restricciones bloqueantes durante el desarrollo?

A) Sí — aplicar todas las reglas SECURITY como restricciones obligatorias (recomendado para aplicaciones de producción)
B) No — omitir las reglas SECURITY (adecuado para prototipos y proyectos experimentales)
C) Otro (describe después del tag [Answer]:)

[Answer]: A

---
