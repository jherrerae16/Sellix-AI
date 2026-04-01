# Personas — Sellix AI
## Plataforma de Inteligencia de Ventas para Droguerías

---

## Persona 1 — Carlos Mendoza
### Gerente / Propietario de la Droguería

| Atributo | Detalle |
|---|---|
| **Edad** | 54 años |
| **Ubicación** | Barranquilla, Colombia |
| **Experiencia** | 28 años en el sector farmacéutico |
| **Educación** | Tecnólogo en Administración de Empresas |
| **Dispositivos** | Computador de escritorio en oficina, tableta personal |

### Perfil
Carlos fundó Droguería Super Ofertas hace 22 años. Conoce a la mayoría de sus clientes frecuentes por nombre y sabe intuitivamente qué productos se venden bien. Sin embargo, su negocio ha crecido hasta manejar más de 3.200 SKUs y atender a casi 1.000 clientes diferentes en un semestre, lo que hace imposible gestionar todo por intuición.

Trabaja entre 10 y 12 horas diarias y no tiene tiempo para analizar hojas de cálculo. Toma decisiones en los pasillos, en el mostrador, o mientras revisa el inventario. Necesita información que llegue a él, no que él tenga que ir a buscarla.

No tiene formación técnica en datos. Le molesta la jerga ("lift", "churn score", "percentil") — prefiere que el sistema le diga directamente qué hacer.

### Objetivos
- Saber de un vistazo si el negocio está creciendo o en riesgo
- Identificar a sus mejores clientes y asegurarse de que no se vayan
- Detectar oportunidades de venta que hoy está dejando pasar
- Tomar decisiones respaldadas por datos, no solo por experiencia

### Frustraciones
- "Tengo los datos en el sistema pero no sé cómo usarlos"
- "Me entero de que un cliente se fue cuando ya es tarde"
- "El cajero no sabe qué ofrecer — pierde ventas todos los días"
- "No sé cuáles productos me generan más tráfico y cuáles son los que todo el mundo compra junto"

### Comportamiento en el dashboard
- Revisa el Resumen Ejecutivo cada mañana antes de abrir
- Consulta el módulo de Churn los lunes para planificar llamadas de la semana
- Usa el módulo RFM para preparar descuentos y bonificaciones a clientes VIP
- Exporta el CSV de reposición y se lo pasa al equipo de domicilios

### Cita representativa
> "Si el sistema me dice que Juan Pérez lleva 45 días sin comprar y su ciclo normal es cada 15 días, yo mismo lo llamo. Solo necesito que me lo diga."

---

## Persona 2 — Valentina Ríos
### Personal de Caja / Vendedora

| Atributo | Detalle |
|---|---|
| **Edad** | 26 años |
| **Ubicación** | Barranquilla, Colombia |
| **Experiencia** | 3 años en atención al cliente en droguería |
| **Educación** | Bachiller técnico en salud |
| **Dispositivos** | Computador de caja (Windows, Chrome) |

### Perfil
Valentina atiende entre 80 y 150 clientes por día en el mostrador. Su ritmo de trabajo es intenso: el cliente llega, pide, paga y se va en menos de 3 minutos en promedio. No tiene tiempo para analizar nada — su trabajo es ejecutar rápido y bien.

Valentina no sabe qué compró el cliente la última vez, qué medicamentos toma, ni si es de los que compran mucho o poco. Cada cliente llega frío para ella, aunque sea un habitual de 10 años.

Si el sistema le dice "ofrécele esto" con una sola frase en lenguaje simple, ella lo hace. Si le muestra una tabla de estadísticas, la ignora porque no tiene tiempo para interpretarla.

### Objetivos
- Saber exactamente qué producto adicional ofrecer en el momento de la venta
- Identificar si el cliente frente a ella está en alguna lista de seguimiento especial
- No perder tiempo con pantallas complejas o pasos innecesarios

### Frustraciones
- "No sé qué ofrecerle al cliente aparte de lo que ya está comprando"
- "A veces el cliente me pregunta por su medicamento y yo no tengo idea si tiene o no tiene"
- "El sistema que usamos no me dice nada útil en el momento de la venta"

### Comportamiento en el dashboard
- Usa exclusivamente el módulo de Venta Cruzada
- Busca el producto que el cliente está comprando y lee la recomendación
- No necesita ver métricas, gráficas ni tablas completas
- Consulta rápida: nombre del producto → recomendación en 5 segundos

### Cita representativa
> "Dime qué le ofrezco cuando me pide el Losartán y ya. No me expliques por qué, solo dímelo."

---

## Persona 3 — Andrés Varela
### Implementador / Consultor — Next AI Tech LLC

| Atributo | Detalle |
|---|---|
| **Edad** | 31 años |
| **Ubicación** | Remoto (Miami / Barranquilla) |
| **Experiencia** | 6 años en desarrollo de software y analytics |
| **Educación** | Ingeniero de Sistemas |
| **Dispositivos** | MacBook, terminal, VS Code |

### Perfil
Andrés es el consultor técnico de Next AI Tech LLC que configura e implementa Sellix AI en cada nuevo cliente. Su responsabilidad es asegurarse de que el ETL funcione correctamente con los datos de cada droguería, generar los JSON actualizados y desplegar la aplicación en Vercel.

No interactúa con el dashboard como usuario final. Su punto de entrada es la terminal y el script ETL. Necesita que el proceso sea reproducible, que los errores sean claros, y que el output sea verificable antes de enviar a producción.

### Objetivos
- Ejecutar el ETL con los datos del cliente y obtener los 8 JSON válidos
- Verificar la calidad de los datos antes de procesar (evitar JSONs corruptos en producción)
- Desplegar la aplicación en Vercel con la configuración de seguridad correcta
- Actualizar los datos del cliente de forma periódica sin romper el dashboard

### Frustraciones
- "Si el ETL falla a mitad del proceso, necesito saber exactamente qué pasó y en qué módulo"
- "Si los datos del cliente tienen inconsistencias, necesito saberlo antes de generar los JSONs"
- "Necesito poder reproducir exactamente el mismo resultado con los mismos datos de entrada"

### Comportamiento con el sistema
- Ejecuta `python scripts/etl.py` desde la terminal
- Lee el reporte de calidad de datos al inicio del proceso
- Verifica que los 8 JSON se generaron en `public/data/`
- Hace commit de los JSON y despliega en Vercel

### Cita representativa
> "El ETL tiene que decirme cuántos clientes encontró, cuántos son válidos para churn, cuántos pares de reposición detectó. Si no me lo dice, no sé si el proceso funcionó bien."
