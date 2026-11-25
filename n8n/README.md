# Workflows de n8n

Instancia: n8n Cloud (plan Starter), versión 2.49.5. Los JSON de `workflows/` se generan con `node n8n/build.js` a partir de `src/core.js` y `agentes/*.md`, así el código de los nodos Code es el mismo que se prueba en `tests/test_core.js`. No contienen secretos: las credenciales se referencian por nombre.

| Archivo | Workflow | Disparador | Rol |
|---|---|---|---|
| 01_CNI_Llamada_LLM.json | CNI · Llamada LLM (seguridad y costo) | Sub-workflow | Loop 2: presupuesto → llamada a Anthropic → registro de tokens y costo |
| 02_CNI_Orquestador.json | CNI · Orquestador (5 roles) | Sub-workflow | Orquestador + Agentes 1–4, carga de skills, Loop 1 (máx. 3 versiones) |
| 03_CNI_Procesar_caso.json | CNI · Procesar caso | Sub-workflow | Folio, registro, orquestador, costos, notificaciones y botones de aprobación |
| 04_CNI_Entrada_Telegram.json | CNI · Entrada Telegram | Telegram Trigger (entrada única) | Deduplicación, lista blanca, /nuevo, /estado, aprobar/rechazar |
| 05_CNI_Voz_API.json | CNI · Voz API (ElevenLabs) | Webhook POST /webhook/cni-voz con Header Auth | Herramienta de servidor del agente de voz |
| 06_CNI_Expiracion.json | CNI · Expiración de aprobaciones | Cada 5 min | Marca EXPIRADO lo no decidido en 15 min |
| 07_CNI_Export_panel.json | CNI · Exportación sanitizada | Webhook GET /webhook/cni-export con Header Auth | Agregados sin datos personales para el panel |

## Importar en otra instancia

1. Crear las tablas de `tablas.md` (Data tables) e importar `datos/catalogo.csv` y `datos/politicas.csv`.
2. Crear las credenciales (nombres exactos): `CNI Telegram bot` (Telegram API), `CNI Anthropic (x-api-key)` (Header Auth, name `x-api-key`), `CNI Voz (x-cni-voz)` (Header Auth), `CNI Export (x-cni-export)` (Header Auth).
3. Importar en este orden: 01 → 02 → 03 → 04, 05, 06, 07. En cada nodo "Execute Workflow" seleccionar el sub-workflow correspondiente (o ejecutar `node n8n/build.js ids.json` con los IDs reales antes de importar).
4. Abrir cada nodo con credencial y volver a vincularla.
5. Publicar (activar) los 7 workflows. El Telegram Trigger registra su webhook al publicar; no debe existir otro receptor del mismo bot.
6. Agregar el `chat_id` del usuario de prueba en la tabla `usuarios` con `rol=gerente`, `activo=true`.
7. Enviar al bot `/nuevo Cotización para Taller Eléctrico Ruiz: 250 contactos dúplex, 12 rollos de cable THW calibre 12 rojo y 60 pastillas de 20 amperes`. Resultado esperado: V1 devuelta por margen, V2 aprobada por el revisor, total 42,195.00 MXN, botones de aprobación.

## Mantener disponible durante la evaluación
n8n Cloud mantiene la instancia encendida; los workflows publicados responden 24/7. Verificar en Overview que la instancia esté "Online" y que los 7 workflows estén publicados.
