# Tablas privadas en n8n Cloud (Data Tables)

Todas viven solo en n8n Cloud. Al repo únicamente se exportan agregados sanitizados.
Tipos de columna de n8n Data Tables: texto, número, booleano y fecha.

## catalogo
Se importa desde `datos/catalogo.csv`. Solo lectura para el Agente 2.

| Columna | Tipo | Uso |
|---|---|---|
| sku | texto | Clave del producto |
| producto | texto | Descripción |
| categoria | texto | Cable, Iluminación, Protección, Canalización, Accesorios, Herramienta |
| unidad | texto | rollo, pieza, tramo, caja |
| precio_lista_mxn | número | Precio de lista sin IVA |
| costo_mxn | número | Costo (privado: nunca se publica) |
| stock | número | Existencia (privado: nunca se publica) |
| desc_max_pct | número | Tope de descuento del SKU |

## politicas
Se importa desde `datos/politicas.csv`. La leen el Cotizador y el Revisor.

| Columna | Tipo | Uso |
|---|---|---|
| clave | texto | Nombre de la regla |
| valor | texto | Valor (se convierte a número en el nodo Code) |
| unidad | texto | Unidad del valor |
| descripcion | texto | Qué controla |

## usuarios
Lista blanca. **Nunca se exporta.** Los chat ID son identificadores privados.

| Columna | Tipo | Uso |
|---|---|---|
| chat_id | texto | ID de Telegram del usuario |
| seudonimo | texto | VEN-01, VEN-02, GER-01 |
| rol | texto | vendedor o gerente |
| activo | booleano | Permite desactivar sin borrar |

## casos
Estado vigente de cada caso. Se exporta solo agregado y sin seudónimos.

| Columna | Tipo | Uso |
|---|---|---|
| caso_id | texto | COT-AAAAMMDD-NNN |
| canal | texto | telegram o voz |
| solicitante | texto | Seudónimo |
| cliente | texto | Nombre ficticio |
| estado | texto | Ver sección 7 del documento base |
| version_actual | número | 1, 2, 3 |
| version_aprobada | número | Versión que liberó el Revisor |
| iteraciones | número | Vueltas del loop Cotizador-Revisor |
| costo_acumulado_usd | número | Suma de la tabla costos para el caso |
| limite_costo_usd | número | Presupuesto del caso |
| aprobacion_nonce | texto | Código de un solo uso del botón |
| aprobacion_expira | fecha | Límite para aprobar |
| decision | texto | aprobado, rechazado, expirado |
| decidido_por | texto | Seudónimo |
| ts_recibido | fecha | Inicio del caso |
| ts_decision | fecha | Fin del caso |
| resultado_json | texto | Propuesta final (JSON) |
| motivo | texto | Razón de rechazo, error o detención |

## costos
Una fila por llamada. Columnas explicadas en `costos/README.md`.

## eventos
Deduplicación persistente.

| Columna | Tipo | Uso |
|---|---|---|
| evento_id | texto | update_id de Telegram, id del callback o id de la llamada de voz |
| tipo | texto | mensaje, callback, voz |
| caso_id | texto | Caso relacionado |
| ts | fecha | Cuándo llegó |
| procesado | booleano | Si ya se ejecutó la acción |
