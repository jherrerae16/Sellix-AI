# User Stories — Sellix AI
## Plataforma de Inteligencia de Ventas para Droguerías

**Idioma**: Español  
**Formato de criterios**: Gherkin (historias críticas) · Lista natural (resto)  
**Estructura**: 8 Épicas · 25 Historias hijas  
**Personas**: Carlos (Gerente) · Valentina (Cajero) · Andrés (Implementador)

---

## ÉPICA E1 — Vista General del Negocio (Resumen Ejecutivo)
**Módulo**: 1.1  
**Persona principal**: Carlos (Gerente)  
**Valor de negocio**: Permite al gerente tomar el pulso del negocio en segundos sin necesidad de abrir hojas de cálculo ni hacer cálculos manuales.

---

### US-E1-01 — Ver KPIs clave del negocio

**Como** Carlos (Gerente),  
**quiero** ver en una sola pantalla las métricas más importantes del período (transacciones, clientes únicos, ingresos, ticket promedio, clientes en riesgo, oportunidades de venta cruzada),  
**para** tomar decisiones comerciales diarias sin tener que buscar la información en múltiples lugares.

**Criterios de aceptación** (lista natural):
- Las 6 tarjetas KPI se muestran al cargar la página sin acción adicional
- Los valores monetarios están en formato COP (`$1.500.000`)
- El contador de "Clientes en riesgo alto" refleja el mismo número que el módulo de Churn
- El contador de "Oportunidades de venta cruzada" refleja los pares con Lift > 1.5
- Los datos corresponden al período seleccionado con el filtro de fechas
- La página carga en menos de 3 segundos

**INVEST**: I-N-V-E-S-T ✓

---

### US-E1-02 — Analizar tendencia de ventas por mes

**Como** Carlos (Gerente),  
**quiero** ver una gráfica de barras con las ventas totales mes a mes durante el período analizado,  
**para** identificar meses de alta y baja demanda y planificar compras de inventario con anticipación.

**Criterios de aceptación** (lista natural):
- La gráfica muestra el eje X con los meses en formato abreviado (May, Jun, Jul...)
- El eje Y muestra ingresos totales en COP
- Al pasar el cursor sobre una barra se muestra el valor exacto del mes
- Los datos cambian al modificar el filtro de canal (Mostrador / Domicilio / Todos)

**INVEST**: I-N-V-E-S-T ✓

---

### US-E1-03 — Identificar los 10 productos más rentables

**Como** Carlos (Gerente),  
**quiero** ver una gráfica horizontal con los 10 productos que generan más ingresos,  
**para** saber qué productos debo priorizar en mi inventario y en mis negociaciones con proveedores.

**Criterios de aceptación** (lista natural):
- La gráfica muestra exactamente los Top 10 productos ordenados de mayor a menor ingreso
- Los nombres de productos se muestran completos (sin truncar) en el eje Y
- Los valores incluyen datos de ambos canales (Ventas + Remisiones) cuando el filtro es "Todos"
- El consumidor final anónimo (ID 222222222222) está incluido en el análisis de productos

**INVEST**: I-N-V-E-S-T ✓

---

### US-E1-04 — Filtrar el dashboard por período y canal

**Como** Carlos (Gerente),  
**quiero** poder seleccionar un rango de fechas y filtrar por canal de venta (Mostrador / Domicilio / Todos),  
**para** comparar el comportamiento del negocio en diferentes períodos y canales.

**Criterios de aceptación** (lista natural):
- El date picker permite seleccionar fecha de inicio y fecha de fin
- Las fechas se muestran en formato DD/MM/YYYY
- Al cambiar el filtro, todos los KPIs y gráficas se actualizan automáticamente
- El filtro persiste mientras el usuario navega entre módulos en la misma sesión

**INVEST**: I-N-V-E-S-T ✓

---

## ÉPICA E2 — Recomendaciones en Punto de Venta (Venta Cruzada)
**Módulo**: 1.2  
**Personas**: Valentina (Cajero) · Carlos (Gerente)  
**Valor de negocio**: Aumenta el ticket promedio por transacción dando al cajero información accionable en el momento exacto de la venta.

---

### US-E2-01 — Ver tabla de asociaciones de productos con métricas

**Como** Carlos (Gerente),  
**quiero** ver una tabla con todos los pares de productos que se compran juntos frecuentemente, incluyendo su lift, confianza e incremento estimado de ticket,  
**para** entender qué combinaciones son más valiosas y diseñar estrategias de promoción inteligentes.

**Criterios de aceptación** (lista natural):
- La tabla muestra columnas: Producto base · Producto recomendado · Veces juntos · Lift · Confianza (%) · Incremento est. ticket (COP)
- Solo aparecen pares con Lift > 1.5
- La tabla admite ordenamiento por cualquier columna
- El incremento estimado de ticket está en formato COP (`+$12.000`)

**INVEST**: I-N-V-E-S-T ✓

---

### US-E2-02 — Buscar recomendaciones por producto (Cajero)

**Como** Valentina (Cajero),  
**quiero** escribir el nombre de un producto en un buscador y ver instantáneamente qué otros productos se recomiendan junto a él,  
**para** ofrecer al cliente el producto complementario correcto sin perder tiempo en el punto de venta.

**Criterios de aceptación** (Gherkin — historia crítica de flujo operacional):

```gherkin
Dado que Valentina está atendiendo a un cliente en caja
Cuando escribe "Losartán" en el buscador del módulo de Venta Cruzada
Entonces ve una lista de productos recomendados para acompañar al Losartán
  Y cada recomendación muestra el nombre del producto, el lift y el incremento de ticket estimado
  Y los resultados aparecen en menos de 1 segundo

Dado que Valentina busca un producto que no tiene recomendaciones
Cuando escribe el nombre en el buscador
Entonces ve un mensaje claro: "No se encontraron recomendaciones para este producto"
  Y no se muestra ninguna tabla vacía ni error

Dado que Valentina borra el texto del buscador
Cuando el campo queda vacío
Entonces la tabla muestra todas las recomendaciones disponibles nuevamente
```

**INVEST**: I-N-V-E-S-T ✓

---

### US-E2-03 — Leer recomendación accionable en lenguaje simple

**Como** Valentina (Cajero),  
**quiero** ver la recomendación del producto como una frase directa y simple, sin tecnicismos,  
**para** decirle exactamente al cliente qué ofrecer sin tener que interpretar métricas.

**Criterios de aceptación** (lista natural):
- El panel de acción muestra una frase del tipo: "Cuando alguien compra **[Producto A]**, ofrécele también **[Producto B]** — aumenta el ticket promedio en ~$XX.000"
- No aparecen palabras técnicas (lift, confianza, soporte, correlación)
- La frase está en español colombiano informal
- El panel es visible sin necesidad de hacer scroll en resolución de escritorio

**INVEST**: I-N-V-E-S-T ✓

---

### US-E2-04 — Filtrar recomendaciones por categoría terapéutica

**Como** Carlos (Gerente),  
**quiero** filtrar las asociaciones de productos por categoría terapéutica (cardiovascular, diabetes, analgésicos, etc.),  
**para** analizar patrones de compra cruzada dentro de una misma área terapéutica.

**Criterios de aceptación** (lista natural):
- El filtro desplegable muestra todas las categorías terapéuticas presentes en los datos
- Al seleccionar una categoría, la tabla muestra solo los pares donde al menos uno de los productos pertenece a esa categoría
- La opción "Todas las categorías" restablece el filtro completo

**INVEST**: I-N-V-E-S-T ✓

---

## ÉPICA E3 — Detección de Clientes en Riesgo de Abandono (Churn)
**Módulo**: 1.3  
**Persona principal**: Carlos (Gerente)  
**Valor de negocio**: Permite actuar antes de perder un cliente — reduce el churn en clientes recurrentes de alto valor.

---

### US-E3-01 — Ver lista priorizada de clientes en riesgo de abandono

**Como** Carlos (Gerente),  
**quiero** ver una tabla con los clientes que llevan más tiempo del esperado sin comprar, ordenados por nivel de riesgo,  
**para** priorizar a quién llamar primero y evitar la pérdida silenciosa de clientes recurrentes.

**Criterios de aceptación** (Gherkin — historia crítica del algoritmo de negocio):

```gherkin
Dado que el ETL ha procesado los datos con fecha de referencia 31/10/2025
Cuando Carlos accede al módulo de Riesgo de Abandono
Entonces ve una tabla con todos los clientes con ≥3 compras históricas
  Y la tabla muestra: Nombre · Cédula · Última compra · Frecuencia habitual (días) · Días sin comprar · Score · Nivel de riesgo · Acción sugerida
  Y los clientes con churn_score ≥ 2.0 aparecen con etiqueta roja "Alto" y acción "Llamar esta semana"
  Y los clientes con score entre 1.3 y 1.99 aparecen con etiqueta ámbar "Medio" y acción "Enviar WhatsApp"
  Y los clientes con score < 1.3 aparecen con etiqueta verde "Bajo" y acción "Monitorear"
  Y el consumidor final (ID 222222222222) no aparece en la tabla

Dado que un cliente tiene exactamente 3 compras históricas
Cuando el ETL calcula su churn score
Entonces el cliente SÍ aparece en la tabla de riesgo
  Y su frecuencia promedio se calcula con los días entre esas 3 compras

Dado que un cliente tiene menos de 3 compras históricas
Cuando el ETL procesa los datos
Entonces ese cliente NO aparece en la tabla de riesgo de abandono
```

**INVEST**: I-N-V-E-S-T ✓

---

### US-E3-02 — Filtrar por nivel de riesgo

**Como** Carlos (Gerente),  
**quiero** filtrar la lista de clientes en riesgo por nivel (Alto / Medio / Bajo / Todos),  
**para** enfocarme primero en los casos más urgentes sin distracciones.

**Criterios de aceptación** (lista natural):
- Los botones de filtro muestran el conteo de clientes por nivel entre paréntesis: "Alto (12) · Medio (34) · Bajo (88)"
- Al seleccionar un nivel, la tabla muestra solo esos clientes
- El botón "Todos" restaura la vista completa

**INVEST**: I-N-V-E-S-T ✓

---

### US-E3-03 — Exportar lista de seguimiento a CSV

**Como** Carlos (Gerente),  
**quiero** descargar la lista de clientes en riesgo como archivo CSV,  
**para** pasarla al equipo de ventas para que hagan el seguimiento por WhatsApp o llamada.

**Criterios de aceptación** (lista natural):
- Un botón "Exportar CSV" está visible en la parte superior de la tabla
- Al hacer clic, el archivo se descarga automáticamente con el nombre `churn_seguimiento.csv`
- El CSV incluye todas las columnas de la tabla con el filtro aplicado en ese momento
- El archivo abre correctamente en Excel con encoding UTF-8 (tildes y ñ correctos)

**INVEST**: I-N-V-E-S-T ✓

---

### US-E3-04 — Ver contador de clientes en riesgo alto en el encabezado

**Como** Carlos (Gerente),  
**quiero** ver siempre el número de clientes en riesgo alto en la barra superior del dashboard,  
**para** tener conciencia constante del nivel de urgencia sin tener que ir al módulo de churn.

**Criterios de aceptación** (lista natural):
- El contador es visible en el TopBar en todas las páginas del dashboard
- El número refleja exactamente los clientes con churn_score ≥ 2.0
- El contador tiene color rojo cuando hay al menos 1 cliente en riesgo alto
- Al hacer clic en el contador, navega directamente al módulo de Churn filtrado por "Alto"

**INVEST**: I-N-V-E-S-T ✓

---

## ÉPICA E4 — Predicción de Reposición de Medicamentos
**Módulo**: 1.4  
**Persona principal**: Carlos (Gerente)  
**Valor de negocio**: Convierte la droguería de reactiva a proactiva — el cliente recibe la llamada antes de quedarse sin su medicamento.

---

### US-E4-01 — Ver próximas reposiciones de medicamentos crónicos

**Como** Carlos (Gerente),  
**quiero** ver una tabla con los clientes que están próximos a necesitar reponer sus medicamentos crónicos habituales,  
**para** contactarlos antes de que lo soliciten y aumentar la frecuencia de recompra.

**Criterios de aceptación** (lista natural):
- La tabla muestra: Cliente · Teléfono · Producto · Última compra · Ciclo habitual (días) · Próxima reposición estimada · Estado
- Solo aparecen pares cliente-producto con ≥2 compras del mismo SKU
- Solo aparecen productos crónicos (en Remisiones OR comprado >3 veces por el mismo cliente)
- Los estados se visualizan con colores: Vencido (rojo) · Esta semana (ámbar) · Próximo mes (verde)
- El consumidor final (ID 222222222222) no aparece en la tabla

**INVEST**: I-N-V-E-S-T ✓

---

### US-E4-02 — Filtrar por estado de reposición y buscar cliente/producto

**Como** Carlos (Gerente),  
**quiero** filtrar la tabla por estado de reposición y buscar por nombre de cliente o producto,  
**para** encontrar rápidamente los casos más urgentes o verificar el estado de un cliente específico.

**Criterios de aceptación** (lista natural):
- Los filtros de estado (Vencido / Esta semana / Próximo mes / Todos) reducen la tabla en tiempo real
- El buscador acepta nombre de cliente o nombre de producto y filtra la tabla mientras se escribe
- Ambos filtros (estado + búsqueda) pueden aplicarse simultáneamente

**INVEST**: I-N-V-E-S-T ✓

---

### US-E4-03 — Exportar lista de contacto de reposición a CSV

**Como** Carlos (Gerente),  
**quiero** descargar la lista de próximas reposiciones como CSV,  
**para** distribuirla al equipo de domicilios para que llamen o envíen mensajes a los clientes.

**Criterios de aceptación** (lista natural):
- El botón "Exportar CSV" descarga el archivo `reposicion_activa.csv`
- El CSV respeta el filtro de estado y búsqueda activo en el momento de la descarga
- El teléfono del cliente se incluye en el CSV para facilitar el contacto directo

**INVEST**: I-N-V-E-S-T ✓

---

## ÉPICA E5 — Segmentación y Protección de Clientes VIP (RFM)
**Módulo**: 2.1  
**Persona principal**: Carlos (Gerente)  
**Valor de negocio**: Identifica los clientes de mayor valor para protegerlos activamente con acciones diferenciadas.

---

### US-E5-01 — Visualizar segmentación de clientes en scatter plot RFM

**Como** Carlos (Gerente),  
**quiero** ver un gráfico interactivo que muestre todos mis clientes posicionados por frecuencia y valor monetario, diferenciados por segmento con colores,  
**para** entender de un vistazo la distribución de mi base de clientes y detectar cuáles grupos necesitan atención.

**Criterios de aceptación** (lista natural):
- El scatter plot muestra: Eje X = Frecuencia de compra, Eje Y = Valor monetario total, Tamaño de burbuja = Recency invertida, Color = Segmento (VIP/Leal/En desarrollo/En riesgo)
- Al pasar el cursor sobre un punto se muestra: nombre del cliente, segmento, CLV estimado, última compra
- La leyenda de colores es visible y en español
- El gráfico es interactivo (zoom, hover) usando Recharts

**INVEST**: I-N-V-E-S-T ✓

---

### US-E5-02 — Ver tabla de clientes con segmento y CLV estimado

**Como** Carlos (Gerente),  
**quiero** ver una tabla con todos mis clientes identificados, su segmento RFM, el valor de vida estimado y su riesgo de churn actual,  
**para** priorizar acciones comerciales de retención con información objetiva.

**Criterios de aceptación** (lista natural):
- La tabla muestra: Cliente · Segmento · CLV estimado anual · Ticket promedio · Frecuencia · Última compra · Nivel de churn
- El CLV está en formato COP con punto de miles
- La tabla admite ordenamiento por cualquier columna
- El filtro por segmento reduce la tabla a ese grupo

**INVEST**: I-N-V-E-S-T ✓

---

### US-E5-03 — Ver perfil detallado de un cliente

**Como** Carlos (Gerente),  
**quiero** hacer clic en un cliente y ver su historial de compras, productos frecuentes, tendencia de gasto y nivel de riesgo,  
**para** preparar una conversación personalizada antes de llamarlo o visitarlo.

**Criterios de aceptación** (lista natural):
- Al hacer clic en una fila de la tabla se abre un panel de detalle (drawer o modal)
- El panel muestra: historial cronológico de compras, top 5 productos más comprados, gráfica de tendencia de gasto mensual, segmento actual y riesgo de churn
- El panel tiene un botón de cierre visible
- La información del panel corresponde exactamente al cliente seleccionado

**INVEST**: I-N-V-E-S-T ✓

---

### US-E5-04 — Filtrar clientes por segmento

**Como** Carlos (Gerente),  
**quiero** filtrar la vista del módulo RFM por segmento (VIP / Leal / En desarrollo / En riesgo / Todos),  
**para** enfocar mis acciones en el grupo que más lo necesita en cada momento.

**Criterios de aceptación** (lista natural):
- Al seleccionar un segmento, tanto la tabla como el scatter plot muestran solo esos clientes
- Los filtros se aplican simultáneamente en ambas vistas
- El botón "Todos" restaura la vista completa

**INVEST**: I-N-V-E-S-T ✓

---

## ÉPICA E6 — Identificación de Productos Gancho
**Módulo**: 2.2  
**Persona principal**: Carlos (Gerente)  
**Valor de negocio**: Revela cuáles productos generan tráfico y arrastran ventas adicionales, base para decisiones de promoción y ubicación en tienda.

---

### US-E6-01 — Ver tabla de productos clasificados por categoría estratégica

**Como** Carlos (Gerente),  
**quiero** ver una tabla con todos los productos clasificados como Gancho Primario, Gancho Secundario, Volumen puro o Nicho estratégico,  
**para** diseñar promociones y negociaciones con proveedores basadas en el rol real de cada producto en el negocio.

**Criterios de aceptación** (lista natural):
- La tabla muestra: Producto · Categoría · Frecuencia de aparición · Poder de arrastre · ¿Descuento frecuente? · Ticket promedio en sesión
- Las categorías se muestran con etiquetas visuales diferenciadas
- La tabla admite ordenamiento y filtro por categoría

**INVEST**: I-N-V-E-S-T ✓

---

### US-E6-02 — Visualizar mapa de burbujas de productos por atracción y arrastre

**Como** Carlos (Gerente),  
**quiero** ver un mapa de burbujas donde los productos se posicionen por frecuencia de aparición y poder de arrastre, con el tamaño de burbuja representando el ticket promedio,  
**para** identificar visualmente cuáles productos son los motores del negocio.

**Criterios de aceptación** (lista natural):
- Eje X: Frecuencia de aparición en sesiones de compra
- Eje Y: Poder de arrastre (promedio de productos adicionales en la misma sesión)
- Tamaño de burbuja: Ticket promedio cuando el producto aparece
- Al pasar el cursor sobre una burbuja, se muestra: nombre del producto, categoría, métricas
- Las burbujas están coloreadas por categoría de gancho

**INVEST**: I-N-V-E-S-T ✓

---

## ÉPICA E7 — Acceso Seguro al Sistema (Autenticación)
**Módulo**: Transversal  
**Personas**: Carlos (Gerente) · Valentina (Cajero)  
**Valor de negocio**: Protege los datos comerciales de la droguería del acceso no autorizado.

---

### US-E7-01 — Iniciar sesión con credenciales de la droguería

**Como** usuario del dashboard (Carlos o Valentina),  
**quiero** acceder al sistema con un usuario y contraseña,  
**para** asegurar que los datos comerciales de la droguería están protegidos.

**Criterios de aceptación** (Gherkin — historia crítica de seguridad):

```gherkin
Dado que un usuario no autenticado accede a cualquier página del dashboard
Cuando el sistema detecta que no hay sesión activa
Entonces redirige automáticamente a la página de login /auth/signin
  Y no muestra ningún dato del dashboard antes de autenticarse

Dado que el usuario ingresa credenciales correctas en el formulario de login
Cuando hace clic en "Iniciar sesión"
Entonces el sistema valida las credenciales con NextAuth.js
  Y redirige al usuario al Resumen Ejecutivo (página principal)
  Y la sesión se almacena de forma segura con cookie HttpOnly + SameSite + Secure

Dado que el usuario ingresa credenciales incorrectas
Cuando hace clic en "Iniciar sesión"
Entonces el sistema muestra el mensaje genérico: "Credenciales inválidas. Intente nuevamente."
  Y NO revela si el usuario o la contraseña es incorrecto específicamente
  Y NO muestra stack traces ni mensajes de error del servidor

Dado que un usuario intenta iniciar sesión más de 5 veces con credenciales incorrectas
Cuando el contador de intentos supera el límite configurado
Entonces el sistema bloquea el intento y muestra: "Demasiados intentos. Espere unos minutos."
```

**INVEST**: I-N-V-E-S-T ✓

---

### US-E7-02 — Cerrar sesión de forma segura

**Como** Carlos o Valentina,  
**quiero** cerrar mi sesión haciendo clic en un botón de cierre de sesión,  
**para** asegurar que nadie más pueda acceder al dashboard desde ese equipo.

**Criterios de aceptación** (lista natural):
- El botón "Cerrar sesión" está visible en el Sidebar o TopBar en todas las páginas
- Al hacer clic, la sesión se invalida en el servidor (NextAuth signOut)
- Después del logout, el usuario es redirigido a la página de login
- Si el usuario presiona "Atrás" en el navegador después del logout, es redirigido al login (no ve el dashboard)

**INVEST**: I-N-V-E-S-T ✓

---

### US-E7-03 — Mantener sesión activa o ser redirigido al login

**Como** Carlos o Valentina,  
**quiero** que mi sesión se mantenga activa mientras trabajo sin pedirme que inicie sesión cada pocos minutos, pero que expire automáticamente si cierro el navegador o paso demasiado tiempo inactivo,  
**para** no perder el trabajo pero tampoco dejar el sistema abierto indefinidamente.

**Criterios de aceptación** (lista natural):
- La sesión tiene un tiempo de expiración configurado (mínimo 8 horas para uso diario)
- Al expirar la sesión, el usuario es redirigido al login con el mensaje: "Tu sesión ha expirado. Inicia sesión nuevamente."
- No se pierde la ruta a la que el usuario quería acceder — después del login se redirige allí

**INVEST**: I-N-V-E-S-T ✓

---

## ÉPICA E8 — ETL y Actualización de Datos
**Módulo**: Pipeline de datos  
**Persona principal**: Andrés (Implementador / Next AI Tech)  
**Valor de negocio**: Garantiza que el dashboard siempre muestre datos válidos, reproducibles y auditables.

---

### US-E8-01 — Ejecutar el ETL y generar los 8 archivos JSON

**Como** Andrés (Implementador),  
**quiero** ejecutar un único comando (`python scripts/etl.py`) que procese los archivos Excel del cliente y genere los 8 JSON en `public/data/`,  
**para** actualizar el dashboard con los datos más recientes sin intervención manual en el código.

**Criterios de aceptación** (Gherkin — historia crítica del pipeline):

```gherkin
Dado que los archivos Ventas_Superofertas.xlsx y Remisiones_Mayo_Octubre_Superofertas.xlsx están en data/raw/
Cuando Andrés ejecuta "python scripts/etl.py" desde la terminal
Entonces el script muestra el reporte de calidad de datos al inicio:
  | Campo                              | Valor esperado       |
  | Registros en Ventas                | 17.721              |
  | Registros en Remisiones            | 2.582               |
  | Clientes identificados             | 957+                |
  | Clientes aptos para churn (≥3)     | 234+                |
  | Pares cliente-producto (reposición)| 891+                |
Y al finalizar genera exactamente 8 archivos JSON en public/data/:
  kpis_resumen.json, ventas_mensuales.json, top_productos.json,
  ventas_cruzadas.json, churn_clientes.json, reposicion_activa.json,
  segmentacion_rfm.json, productos_gancho.json
Y el script termina con el mensaje "ETL completado exitosamente. 8 archivos JSON generados."

Dado que se ejecuta el ETL dos veces con los mismos archivos de entrada
Cuando los JSONs se comparan
Entonces los archivos son byte-a-byte idénticos (reproducibilidad garantizada)
```

**INVEST**: I-N-V-E-S-T ✓

---

### US-E8-02 — Verificar calidad de datos antes de procesar

**Como** Andrés (Implementador),  
**quiero** que el ETL me muestre un reporte de calidad de los datos al inicio del proceso,  
**para** detectar inconsistencias o archivos incorrectos antes de generar los JSONs y evitar publicar datos corruptos.

**Criterios de aceptación** (lista natural):
- El reporte de calidad indica: total de registros por archivo, rango de fechas, clientes identificados vs. anónimos, productos únicos, campos con valores nulos y su porcentaje
- Si se detectan anomalías críticas (archivo vacío, columnas faltantes), el ETL se detiene con un mensaje claro de error antes de generar ningún JSON
- El reporte se imprime en la consola con el encabezado: `=== SELLIX AI — RESUMEN DE CALIDAD DE DATOS ===`

**INVEST**: I-N-V-E-S-T ✓

---

### US-E8-03 — Obtener confirmación explícita del éxito del proceso

**Como** Andrés (Implementador),  
**quiero** recibir un mensaje de confirmación al finalizar el ETL que liste los archivos generados y sus tamaños,  
**para** verificar que todos los módulos se procesaron correctamente antes de hacer el deploy a Vercel.

**Criterios de aceptación** (lista natural):
- El mensaje final muestra la lista de los 8 archivos JSON generados con su ruta y tamaño en KB
- Si algún módulo falló, el mensaje indica cuál módulo falló y la razón, sin detener los demás módulos
- El código de salida del script es 0 si todos los JSONs se generaron, y distinto de 0 si alguno falló

**INVEST**: I-N-V-E-S-T ✓

---

## Resumen de Cobertura

| Épica | Historias | RF cubiertos |
|---|---|---|
| E1 — Resumen Ejecutivo | 4 | RF-011.1 · RF-011.2 · RF-011.3 · RF-011.4 · RF-011.5 · RF-011.6 |
| E2 — Venta Cruzada | 4 | RF-012.1 · RF-012.2 · RF-012.3 · RF-012.4 · RF-012.5 |
| E3 — Churn | 4 | RF-013.1 · RF-013.2 · RF-013.3 · RF-013.4 · RF-013.5 · RF-013.6 |
| E4 — Reposición | 3 | RF-014.1 · RF-014.2 · RF-014.3 · RF-014.4 · RF-014.5 · RF-014.6 |
| E5 — RFM/VIP | 4 | RF-021.1 · RF-021.2 · RF-021.3 · RF-021.4 · RF-021.5 · RF-021.6 · RF-021.7 |
| E6 — Productos Gancho | 2 | RF-022.1 · RF-022.2 · RF-022.3 · RF-022.4 · RF-022.5 |
| E7 — Autenticación | 3 | RF-031.1 · RF-031.2 · RF-031.3 · RF-031.4 |
| E8 — ETL Pipeline | 3 | RF-001.1 · RF-001.2 · RF-001.3 · RF-001.4 · RF-001.5 · RF-001.6 · RF-001.7 |
| **Total** | **27 historias** | **100% de RF cubiertos** ✓ |

### Verificación INVEST global
- [x] Independent — cada historia es entregable de forma independiente
- [x] Negotiable — criterios de aceptación son ejemplos, no contratos rígidos
- [x] Valuable — cada historia tiene valor directo para su persona
- [x] Estimable — alcance claro para estimación de esfuerzo
- [x] Small — cada historia cabe en una iteración de desarrollo
- [x] Testable — criterios de aceptación verificables (Gherkin en historias críticas)
