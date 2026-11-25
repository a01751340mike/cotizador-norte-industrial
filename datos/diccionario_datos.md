# Diccionario de datos

Todas las tablas viven en n8n Cloud (Data tables privadas). Al repositorio solo llegan `datos/catalogo.csv` y `datos/politicas.csv`, que son ficticios, y la exportación agregada `web/data/panel.json`.

## catalogo (30 filas, ficticio)
| Campo | Tipo | Descripción | Público |
|---|---|---|---|
| sku | texto | Clave única `CAT-XXX-...` | sí |
| producto | texto | Descripción comercial | sí |
| categoria | texto | Cable, Iluminación, Protección, Canalización, Accesorios, Herramienta | sí |
| unidad | texto | rollo, pieza, tramo, caja | sí |
| precio_lista_mxn | número | Precio sin IVA | sí |
| costo_mxn | número | Costo ficticio, solo lo usan las reglas del servidor (el modelo nunca lo ve) | no en el panel |
| stock | número | Existencia ficticia para advertencias | no en el panel |
| desc_max_pct | número | Tope de descuento por SKU | sí |

## politicas (20 reglas)
`clave`, `valor` (texto que el servidor convierte a número), `unidad`, `descripcion`. Ver `datos/politicas.csv`.

## usuarios (privada, nunca se exporta)
| Campo | Tipo | Descripción |
|---|---|---|
| chat_id | texto | ID de usuario de Telegram (dato personal: no se publica) |
| seudonimo | texto | GER-01, VEN-01… (lo único que aparece en trazas) |
| rol | texto | gerente o vendedor |
| activo | booleano | Permite desactivar sin borrar |

## casos (privada)
| Campo | Tipo | Descripción | En panel |
|---|---|---|---|
| caso_id | texto | `COT-AAAAMMDD-NNN` (fecha CDMX) | sí |
| canal | texto | telegram o voz | sí |
| solicitante | texto | Seudónimo o VOZ-PUBLICO | no |
| chat_id_solicitante | texto | Para notificar; dato personal | no |
| solicitud | texto | Texto enmascarado (correos/teléfonos/RFC) | no |
| cliente | texto | Cliente ficticio | no |
| estado | texto | EN_PROCESO, PENDIENTE_APROBACION, APROBADO, RECHAZADO, EXPIRADO, ACLARACION, FUERA_DE_POLITICA, BLOQUEADO, DETENIDO_LIMITE, ERROR | sí |
| version_actual / version_aprobada | número | Versiones del loop de calidad | sí (versión final) |
| iteraciones | número | Vueltas Cotizador-Revisor | sí |
| costo_acumulado_usd / llamadas_llm / limite_costo_usd | número | Control de presupuesto | costo sí |
| total_mxn | número | Total simulado | sí |
| aprobacion_nonce / aprobacion_expira | texto | Código de un uso y fecha límite | no |
| decision / decidido_por / ts_decision | texto | Cierre humano | no |
| ts_recibido / ts_propuesta | texto ISO | Para el KPI de tiempo de respuesta | derivado |
| resultado_json / traza_json | texto | Propuesta y traza sanitizada | no |
| motivo | texto | Error, aclaración o causa de detención | no |

## costos (privada; una fila por llamada) — ver `costos/costos.csv`
## eventos (privada; deduplicación)
`evento_id` (`tg:<update_id>`), `tipo`, `caso_id`, `ts`, `procesado`.

## web/data/panel.json (pública)
`meta` (empresa, fuente, generado, datos_ficticios, modo), `kpis` (con denominadores) y `casos` con solo estas columnas: caso_id, fecha, canal, estado, version_final, iteraciones, lineas, total_mxn, respuesta_seg, costo_ia_usd. `scripts/validar_publicacion.js` rechaza cualquier otra columna.
