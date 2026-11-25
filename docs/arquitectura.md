# Arquitectura

```mermaid
flowchart TD
  U1[Usuario autorizado\nTelegram] -->|/nuevo /estado botones| TG[CNI · Entrada Telegram\nTelegram Trigger único]
  U2[Visitante del panel] --> W[GitHub Pages\nindex.html + panel.json]
  W -->|widget, consentimiento| EL[Agente ElevenLabs]
  EL -->|POST gestionar_caso\nheader x-cni-voz| VZ[CNI · Voz API]
  TG -->|dedupe eventos\nlista blanca\nguardrail| PC[CNI · Procesar caso\nfolio COT-AAAAMMDD-NNN]
  VZ -->|valida campos\nguardrail| PC
  PC --> OR[CNI · Orquestador\ncontrol determinista]
  OR -->|carga SKILL.md + huella| SK[(skills/ en GitHub main)]
  OR --> A1[Agente 1 Intake]
  A1 --> A2[Agente 2 Catálogo]
  A2 --> A3[Agente 3 Cotizador\ncalcularCotizacion + modelo]
  A3 --> A4[Agente 4 Revisor\nreglas + modelo]
  A4 -->|DEVUELTO, máx 3| A3
  A1 & A2 & A3 & A4 -.->|cada llamada| LL[CNI · Llamada LLM\nloop seguridad-costo]
  LL -->|x-api-key| AN[Anthropic\nclaude-haiku-5-5]
  OR --> PC
  PC -->|casos, costos| DB[(n8n Data tables privadas)]
  PC -->|botones nonce+versión| G[Gerencia en Telegram]
  G --> TG
  EX[CNI · Expiración\ncada hora] --> DB
  DB --> XP[CNI · Exportación sanitizada]
  GA[GitHub Actions\npruebas + controles] -->|GET x-cni-export| XP
  GA -->|solo si pasan| W
```

## Zonas
| Zona pública | Zona privada |
|---|---|
| HTML, estilos, script, `panel.json` con folio, fecha, canal, estado, versión, líneas, total simulado, tiempo y costo por caso | Tokens, API keys, secretos de webhooks, `chat_id`, seudónimos, solicitudes, clientes, trazas detalladas, aprobaciones, costo y stock del catálogo |
| `agent-id` público de ElevenLabs | Secreto `x-cni-voz` (en ElevenLabs y n8n) |

## Decisiones
- **Orquestador determinista.** El orden del proceso es fijo y auditable. Usar el modelo para enrutar costaría más y agregaría otra fuente de error.
- **Cálculos fuera del modelo.** El Agente 3 usa una herramienta determinista. El modelo solo redacta supuestos, y el servidor rechaza cualquier total que no coincida.
- **Revisor en dos capas.** Primero corren las reglas. Si las reglas ya devolvieron la versión, no se llama al modelo (optimización medida).
- **Una sola puerta al modelo.** El sub-workflow "Llamada LLM" concentra el presupuesto, los reintentos y el registro de tokens. Ningún agente puede saltárselo.
- **Sub-workflows.** No cuentan para la cuota de n8n y mantienen el estado del caso sin depender de referencias entre nodos.
- **Skills cargados en tiempo de ejecución desde `main`.** El texto que se prueba y versiona es el mismo que usa el agente, y la traza guarda versión y huella.
