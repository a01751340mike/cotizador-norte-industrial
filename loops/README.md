# Loops ejecutables

Los dos loops corren dentro del workflow **CNI · Orquestador** en n8n. Sus reglas viven en `src/core.js` (probadas en `tests/test_core.js`) y sus límites en la tabla `politicas`. La evidencia de cada ejecución queda en la traza del caso (`casos.traza_json`) y en `evidencias/`.

## Loop 1 · Calidad de negocio (Cotizador ↔ Revisor)

| Campo | Definición |
|---|---|
| Secuencia | Generar (Agente 3, versión Vn) → medir (reglas del Agente 4: precio, tope, margen, cálculos, política) → diagnosticar (hallazgos) → corregir (`aplicarCorrecciones`, Vn+1) → validar (reglas + revisión del modelo) |
| Entrada | Líneas verificadas del Agente 2, políticas y correcciones de la vuelta anterior |
| Responsable | Orquestador (controla vueltas); Agente 3 genera; Agente 4 dictamina |
| Criterios de salida exitosa | Reglas sin hallazgos **y** dictamen del modelo APROBADO |
| Máximo de iteraciones | 3 (política `max_iteraciones_loop`). Se mantiene el valor de la guía: el caso de referencia se corrige en 2 vueltas y una tercera cubre una corrección de texto |
| Tiempo límite | 120 s por caso (`tiempo_max_caso_seg`) |
| Presupuesto | El del caso (0.02 USD); lo vigila el Loop 2 |
| Acción de retorno | DEVUELTO corregible → nueva versión con correcciones; fuera de política → FUERA_DE_POLITICA (no se reintenta) |
| Estado al agotar el límite | DETENIDO_LIMITE con la última versión y sus hallazgos; no se pide aprobación |

## Loop 2 · Seguridad y costo (antes de cada llamada al modelo)

| Campo | Definición |
|---|---|
| Secuencia | Evaluar permisos y presupuesto (`verificarPresupuesto`) → ejecutar el paso autorizado (llamada HTTP al modelo con timeout 30 s y 1 reintento) → registrar consumo (tokens reportados por el proveedor y costo con la fórmula de la guía) → revisar límite y resultado → continuar o detener |
| Entrada | Estado del caso: costo acumulado, llamadas hechas, hora de inicio; tarifa vigente |
| Responsable | Orquestador |
| Criterios para continuar | llamadas + 1 ≤ 8; costo acumulado + reserva (2,500 tokens de entrada y max_tokens de salida) ≤ 0.02 USD; tiempo ≤ 120 s |
| Máximo de iteraciones | Una evaluación por llamada; máximo 8 llamadas por caso |
| Acción de retorno | Error HTTP o timeout → 1 reintento acotado; si persiste, ERROR con mensaje comprensible |
| Estado al agotar el límite | DETENIDO_LIMITE con la causa (PRESUPUESTO, MAX_LLAMADAS o TIEMPO) registrada en `casos.motivo` |

## Evidencia V1 → V2
Caso de referencia (mismo `caso_id`): V1 con 8 % en ACC-CON-DUP queda con margen 16.30 % → DEVUELTO sin llamar al modelo revisor → V2 con 6 % y margen 18.09 % → APROBADO. Costo adicional de la corrección = llamada del Agente 3 en V2 + llamada del Agente 4 en V2 (ver `costos/costos.csv`, filas del caso). Reutilización: un segundo caso distinto ejecuta los mismos skills (ver `evidencias/`).

## Autoevaluación (0–4 por aspecto; mínimo 16/20 y ningún aspecto < 3)

| Elemento | Claridad | Secuencia | Evidencia | Control/retorno | Utilidad | Total |
|---|---|---|---|---|---|---|
| Skill cotizar-material-electrico | 4 | 4 | 4 | 3 | 4 | 19 |
| Skill revisar-cotizacion | 4 | 4 | 4 | 4 | 4 | 20 |
| Loop calidad de negocio | 4 | 4 | 4 | 4 | 4 | 20 |
| Loop seguridad y costo | 4 | 3 | 4 | 4 | 3 | 18 |

Justificación de los 3: el skill de cotizar depende del orquestador para el control de versiones (no lo hace por sí mismo); el loop de seguridad usa una reserva fija de tokens en lugar de contar tokens exactos antes de llamar; la utilidad del loop de costo es preventiva y rara vez se activa con Haiku. La evidencia de cada fila se completa con las trazas reales en `evidencias/`.
