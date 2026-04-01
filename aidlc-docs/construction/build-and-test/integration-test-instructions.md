# Instrucciones de Tests de Integración — Sellix AI

## IT-1 — ETL → Dashboard (flujo completo)

**Objetivo**: Verificar que los JSON generados por el ETL se visualizan
correctamente en el dashboard sin errores.

```
PRECONDICIÓN: Archivos Excel disponibles en data/raw/

PASOS:
1. python scripts/etl.py
2. Verificar: 8 archivos JSON creados en public/data/
3. npm run build (sin errores TypeScript)
4. npm start
5. Iniciar sesión
6. Navegar por los 6 módulos: /, /cruzada, /churn, /reposicion, /vip, /gancho
7. Verificar: ningún módulo muestra error.tsx o pantalla en blanco
8. Verificar: los números en KPI cards coinciden con los totales del CSV fuente
```

**Resultado esperado**: Dashboard completamente funcional con datos reales.

---

## IT-2 — Auth → Rutas protegidas → Datos

**Objetivo**: Verificar que el ciclo completo de autenticación protege todas
las rutas y que los datos cargan correctamente tras autenticación.

```
PASOS:
1. Sin sesión activa: intentar GET /churn, /vip, /gancho
2. Verificar: todos redirigen a /auth/signin
3. Iniciar sesión
4. Verificar: cada ruta carga con datos (no vacía)
5. La cookie de sesión expira en 8h (verificar en DevTools → Application → Cookies)
6. Cerrar sesión → verificar que las rutas vuelven a redirigir
```

**Resultado esperado**: Acceso completamente bloqueado sin sesión.

---

## IT-3 — Filtros → Exportación CSV

**Objetivo**: Verificar que la exportación CSV respeta los filtros aplicados.

```
PASOS EN /churn:
1. Aplicar filtro: nivel_riesgo = "Alto"
2. Exportar CSV
3. Abrir CSV: verificar que SOLO contiene filas con nivel_riesgo=Alto
4. Verificar: encoding UTF-8 con BOM (abrir en Excel sin problemas de tildes)

PASOS EN /reposicion:
1. Seleccionar tab "Vencido"
2. Buscar texto parcial de un cliente
3. Exportar CSV
4. Verificar: solo contiene el subconjunto filtrado
```

**Resultado esperado**: CSV exportado es consistente con la vista filtrada.

---

## IT-4 — Navegación entre módulos

**Objetivo**: Verificar que la navegación del Sidebar funciona sin pérdida de estado.

```
PASOS:
1. Ir a /churn → aplicar filtro "Alto"
2. Navegar al Sidebar → hacer clic en "Venta Cruzada"
3. Volver a /churn (botón atrás del browser o Sidebar)
4. Verificar: la página recarga los datos desde el JSON (no caché de filtros — normal)
5. Verificar: el link activo en el Sidebar corresponde a la ruta actual en todos los módulos
```

**Resultado esperado**: Navegación fluida sin errores de hidratación ni pantallas en blanco.

---

## IT-5 — Error handling (página con JSON vacío)

**Objetivo**: Verificar que el error boundary captura fallos graciosamente.

```
PASOS:
1. Renombrar temporalmente public/data/kpis_resumen.json → kpis_resumen.json.bak
2. npm start (o npm run dev)
3. Iniciar sesión → navegar a /
4. Verificar: aparece error.tsx con mensaje "Ocurrió un error" (no pantalla en blanco)
5. Verificar: NO se muestra stack trace ni código al usuario
6. Restaurar el archivo: mv kpis_resumen.json.bak kpis_resumen.json
```

**Resultado esperado**: Error boundary captura el fallo con mensaje genérico.
