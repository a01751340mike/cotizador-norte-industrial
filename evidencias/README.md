# Índice de evidencias y enlaces por criterio de la rúbrica

Todas las capturas muestran solo el chat del bot de prueba o las páginas del proyecto. Los datos son ficticios.

| # | Criterio (pts) | Subcriterio | Evidencia |
|---|---|---|---|
| 1 | Caso e integración (5) | Problema, usuario y KPI | `docs/informe.pdf` §1–2; panel (encabezado y 3 KPI) |
| | | Arquitectura concatenada y `caso_id` compartido | `docs/arquitectura.md`; `trazas/COT-20261124-013.json` (voz → mismo registro → Telegram) |
| 2 | Ecosistema agéntico (15) | Orquestador operativo | `n8n/workflows/02_CNI_Orquestador.json`; trazas con PLAN, límites y cierre |
| | | 4 agentes con aportación verificable | `trazas/COT-20261124-002.json` (A1 cliente y partidas; A2 fuentes por SKU; A3 V1/V2; A4 DEVUELTO/APROBADO) |
| | | Contratos y trazas | `agentes/contratos/*.json`; `trazas/` |
| 3 | n8n y Telegram (12) | Inicio y respuesta | `capturas/P01_*` |
| | | Registro y bifurcación | `capturas/P05_*`, `P06_*`, `P02b_*`, `P09_*` (aclaración, bloqueo, fuera de política, límite) |
| | | Aprobación, rechazo y cierre | `capturas/P01_COT-002_aprobada_por_gerencia.jpg`, `P04_*`; COT-004 rechazada; COT-005 expirada (panel) |
| | | Exportación reproducible | `n8n/workflows/`, `n8n/README.md`, `n8n/build.js` |
| 4 | Pages y Actions (10) | Sitio público | https://a01751340mike.github.io/cotizador-norte-industrial/ |
| | | Validación previa | `tests/test_core.js`, `scripts/validar_publicacion.js` |
| | | Bloqueo y recuperación | Actions runs 45532805585 (falla) y 45532969305 (recuperación) |
| | | Datos sanitizados actualizados | `capturas/P12_P14_panel_publicado_con_exportacion.jpg`; paso "Obtener exportación" de la corrida 45532545912 |
| 5 | Skills y loops (10) | Skills cargados y usados | Traza PLAN con huellas 930c5fbb y 216a6626; `skill` en cada paso de A3/A4 |
| | | Loops con criterios, retorno y límites | `loops/README.md`; P09 y COT-005 |
| | | V1 → V2 y reutilización | COT-002 y COT-005 (dos casos distintos con corrección) |
| 6 | ElevenLabs y VizData (14) | Voz embebida | Widget en el panel con consentimiento; `capturas/P13_microfono_denegado_*` |
| | | Herramienta conectada | `capturas/P03_voz_consulta_y_creacion_COT-013_traza_ElevenLabs.jpg`; conversación conv_8601m888g7xhff9tx70ed63850tf |
| | | KPI y visualización | Panel; definición de KPI en el informe §6 |
| | | Accesibilidad y estados | `capturas/P13_movil_390px_*`, `P13_escritorio_1366px_*` (foco visible); estados de carga, vacío, sin resultados, error y desactualizado en `web/index.html` |
| 7 | Guardrails (12) | Acceso y secretos | P07; `scripts/validar_publicacion.js`; credenciales por nombre |
| | | Entradas, fuentes e inyección | P05, P06; A2 verifica SKUs; A3 rechaza totales distintos |
| | | Herramientas y aprobación | Credencial de Anthropic restringida a api.anthropic.com; campos permitidos en /cni-voz; P04 |
| | | Presupuesto, fallas y duplicados | P08, P09, P10 |
| 8 | Tokenización y costos (10) | Registro por etapa y llamada | `costos/costos.csv` (40 llamadas + voz + plataformas + desarrollo) |
| | | Fórmulas, tarifas y conciliación | `costos/tarifas.csv`, `costos/analisis.py`, `costos/resumen_por_caso.csv` |
| | | Escenarios y optimización | `costos/proyecciones.csv`, `costos/RESUMEN.md` (antes/después COT-002 vs COT-010) |
| 9 | Pruebas y reproducibilidad (7) | Matriz completa | `tests/pruebas.csv` |
| | | README reproducible | `README.md` |
| | | Limitaciones y uso de IA | Informe §10; `docs/declaracion_uso_ia.md` |
| 10 | Defensa (5) | Demostración y preguntas | `docs/guion_demo.md`; video de respaldo |

## Casos registrados (24-nov-2026, hora CDMX)
| Folio | Canal | Resultado | Para qué sirve |
|---|---|---|---|
| COT-20261124-001 | Telegram | ERROR (respuesta truncada) | P08: falla controlada; origen de la optimización |
| COT-20261124-002 | Telegram | APROBADO, V2, 42,195.00 | P01, P04, P11 (antes de optimizar) |
| COT-20261124-003 | Telegram | ERROR (respuesta truncada) | Falla controlada |
| COT-20261124-004 | Telegram | RECHAZADO, V1, 18,986.88 | P02, P04 rechazo |
| COT-20261124-005 | Telegram | EXPIRADO, V2, 53,462.08 | P02, P04 vencimiento, P11 reutilización |
| COT-20261124-006 | Telegram | ACLARACION | P05 |
| COT-20261124-007 | Telegram | BLOQUEADO | P06 |
| COT-20261124-008 | Telegram | ERROR (respuesta truncada) | Falla controlada |
| COT-20261124-009 | Telegram | FUERA_DE_POLITICA | Rama de negocio |
| COT-20261124-010 | Telegram | APROBADO, V2, 42,195.00 | Después de optimizar |
| COT-20261124-011 | Telegram | DETENIDO_LIMITE | P09 |
| COT-20261124-012 | Telegram | ERROR (API) | P08 |
| COT-20261124-013 | Voz | PENDIENTE_APROBACION, V1, 4,605.20 | P03 |

## Capturas de plataformas (26-nov-2026, prefijo `X_`)
| Archivo | Qué muestra |
|---|---|
| `X_n8n_workflows.jpg` | Workflows del proyecto publicados en n8n Cloud (88 ejecuciones de producción, 0 fallidas) |
| `X_n8n_orquestador.jpg` | Lienzo del orquestador con los 4 agentes |
| `X_n8n_loop.jpg` | Ejecución 19 (COT-002): Agente 3 y ruta del revisor con 2 pasadas (V1→V2) |
| `X_n8n_tabla_casos.jpg` | Tabla `casos` con los 13 folios (chat_id difuminado) |
| `X_n8n_tabla_costos.jpg` | Tabla `costos` con tokens por llamada |
| `X_anthropic_uso.jpg` | Consola de Anthropic: 69,614 tokens de entrada y 15,795 de salida = suma de `costos/costos.csv` |
| `X_elevenlabs_agente.jpg`, `X_elevenlabs_herramienta.jpg` | Agente de voz y herramienta `gestionar_caso` (3 llamadas, 0 % error) |
| `X_github_repo.jpg`, `X_github_actions_corridas.jpg`, `X_actions_falla_log.jpg`, `X_actions_recuperacion.jpg` | Repositorio, corridas de Actions, log de la corrida bloqueada y corrida recuperada |
