# Instrucciones de Tests Unitarios — Sellix AI

## Tests Manuales de Verificación

> El proyecto MVP no incluye suite de tests automatizados. Las verificaciones
> son manuales sobre el build de desarrollo.

---

## Unit 1 — Foundation & Auth

### UT-1.1: Login exitoso
```
1. npm run dev
2. Navegar a http://localhost:3000 → redirigir a /auth/signin
3. Ingresar usuario y contraseña correctos (del .env.local)
4. Verificar: redirige a / y muestra "Resumen Ejecutivo"
5. Verificar: TopBar muestra nombre de usuario
6. Verificar: Sidebar muestra 6 enlaces de navegación
```

### UT-1.2: Login fallido — error genérico
```
1. Navegar a /auth/signin
2. Ingresar credenciales incorrectas
3. Verificar: aparece mensaje "Usuario o contraseña incorrectos."
4. Verificar: NO se indica si el usuario existe o no
5. Verificar: NO se expone información técnica del error
```

### UT-1.3: Rate limiting (5 intentos)
```
1. Intentar login fallido 5 veces seguidas
2. En el 6to intento: verificar que sigue mostrando error genérico (no bloqueo visible)
3. Verificar en consola del servidor: log de AUTH_EVENT:auth_blocked
```

### UT-1.4: Protección de rutas
```
1. Cerrar sesión (botón "Cerrar sesión" en Sidebar)
2. Intentar navegar a /churn directamente en URL
3. Verificar: redirige a /auth/signin con callbackUrl=/churn
4. Después de login: redirige de vuelta a /churn
```

### UT-1.5: Logout
```
1. Iniciar sesión
2. Hacer clic en "Cerrar sesión" en el Sidebar
3. Verificar: redirige a /auth/signin
4. Verificar: acceder a / redirige a /auth/signin (sesión eliminada)
```

### UT-1.6: Headers de seguridad HTTP
```
1. npm run build && npm start
2. En DevTools → Network → seleccionar cualquier respuesta HTML
3. Verificar headers presentes:
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin
   - Strict-Transport-Security (en producción)
```

---

## Unit 2 — ETL Pipeline

### UT-2.1: Calidad de datos
```
1. python scripts/etl.py
2. Verificar output de resumen_calidad_datos():
   - Cuenta de registros en Ventas y Remisiones
   - Clientes identificados
   - Clientes aptos para churn (>=3 compras)
   - Pares aptos para reposición (>=2 compras mismo SKU)
```

### UT-2.2: Exclusión del consumidor anónimo
```
1. Abrir public/data/churn_clientes.json
2. Verificar: ningún registro tiene cedula="222222222222"
3. Abrir public/data/clientes_rfm.json
4. Verificar: ningún registro tiene cedula="222222222222"
5. Abrir public/data/ventas_cruzadas.json
6. Verificar: existen registros (anónimo incluido en análisis de productos)
```

### UT-2.3: Validez de JSON
```
1. Para cada archivo en public/data/:
   node -e "JSON.parse(require('fs').readFileSync('public/data/ARCHIVO.json'))"
2. Verificar: ningún archivo lanza error de parseo
```

### UT-2.4: Umbral de lift
```
1. Abrir public/data/ventas_cruzadas.json
2. Verificar: todos los registros tienen lift >= 1.5
3. Verificar: todos tienen veces_juntos >= 10
```

### UT-2.5: Clasificación de churn
```
1. Abrir public/data/churn_clientes.json
2. Tomar 3 registros al azar
3. Para cada uno: verificar manualmente
   - churn_score = dias_sin_comprar / frecuencia_promedio_dias
   - nivel_riesgo correcto según score (>=2.0=Alto, >=1.3=Medio, <1.3=Bajo)
```

---

## Unit 3 — Módulos Fase 1

### UT-3.1: Resumen Ejecutivo
```
1. Navegar a /
2. Verificar: 6 tarjetas KPI muestran valores > 0
3. Verificar: gráfico de ventas mensuales tiene al menos 1 barra
4. Verificar: top productos tiene 10 barras
5. Verificar: histograma de frecuencia tiene al menos 1 barra
```

### UT-3.2: Venta Cruzada — flujo cajero
```
1. Navegar a /cruzada
2. Escribir un producto en el buscador (ej: "Metformina")
3. Verificar: aparece AccionCajaPanel con texto de recomendación
4. Verificar: tabla se filtra por el producto escrito
5. Borrar el texto: verificar que el panel desaparece
```

### UT-3.3: Churn — filtros y exportación
```
1. Navegar a /churn
2. Seleccionar "Alto" en el dropdown de riesgo
3. Verificar: solo se muestran clientes con nivel_riesgo=Alto
4. Hacer clic en un cliente → verificar que se abre el drawer lateral
5. Cerrar drawer
6. Hacer clic en "Exportar CSV"
7. Verificar: descarga un archivo .csv con los datos filtrados
8. Abrir CSV en Excel: verificar que las tildes/ñ se ven correctamente
```

### UT-3.4: Reposición — tabs de urgencia
```
1. Navegar a /reposicion
2. Hacer clic en tab "Vencido"
3. Verificar: solo se muestran registros con estado=Vencido y dias < 0
4. Hacer clic en tab "Esta semana"
5. Verificar: días_para_reposicion entre 0 y 7
6. Buscar un cliente por nombre
7. Verificar: tabla se filtra en tiempo real
```

---

## Unit 4 — Módulos Fase 2

### UT-4.1: VIP / RFM — scatter plot
```
1. Navegar a /vip
2. Verificar: scatter plot tiene puntos de 4 colores (segmentos)
3. Hacer hover sobre un punto → verificar tooltip con nombre y CLV
4. Hacer clic en un punto → verificar que se abre ClienteDetailPanel
5. Verificar: scores R/F/M (1-5) visibles en el drawer
```

### UT-4.2: VIP — filtro por segmento
```
1. Hacer clic en chip "VIP"
2. Verificar: tabla muestra solo clientes VIP
3. Verificar: conteo en chip coincide con filas visibles
4. Hacer clic en "Todos"
5. Verificar: todos los clientes vuelven a aparecer
```

### UT-4.3: Productos Gancho — mapa de burbujas
```
1. Navegar a /gancho
2. Verificar: mapa de burbujas tiene puntos de 4 colores
3. Verificar: algunos puntos son más grandes que otros (ticket distinto)
4. Hover sobre burbuja → verificar tooltip con nombre y métricas
```

### UT-4.4: Gancho — filtro por categoría
```
1. Hacer clic en chip "Gancho Primario"
2. Verificar: tabla muestra solo Gancho Primario
3. Verificar: barras de progreso reflejan los valores de cada producto
```
