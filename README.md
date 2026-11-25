# Cotizador Norte Industrial

Proyecto final individual de **AI Tools** · Miguel Ángel Morales Azamar

Una gerencia comercial recibe solicitudes de cotización de material eléctrico por Telegram o por voz. Un orquestador y cuatro agentes especialistas las convierten en una propuesta revisada. La gerencia la aprueba o la rechaza en Telegram, y un panel público muestra los indicadores con datos sanitizados.

> **Datos ficticios · modo SIMULADO.** Distribuidora Norte Industrial es una empresa inventada. Ninguna cotización llega a un cliente real; la acción que se aprueba solo se registra como simulada.

| Enlace | URL |
|---|---|
| Panel público (GitHub Pages) | https://a01751340mike.github.io/cotizador-norte-industrial/ |
| Workflow de Actions | https://github.com/a01751340mike/cotizador-norte-industrial/actions/workflows/validar-y-publicar.yml |
| Corrida bloqueada por un control (P12) | https://github.com/a01751340mike/cotizador-norte-industrial/actions/runs/45532805585 |
| Corrida de recuperación (P12) | https://github.com/a01751340mike/cotizador-norte-industrial/actions/runs/45532969305 |
| Bot de Telegram | @cni_cotizador_mike_bot (solo usuarios de la lista blanca; acceso por el canal privado del curso) |
| Agente de voz | ElevenLabs `agent_4701m887kbz7fb48kg3ztwx4xcmm` (widget dentro del panel) |
| n8n | `https://bycicle.app.n8n.cloud` (privado) |

## Cómo fluye un caso (mismo `caso_id` en todo el sistema)

```
Telegram /nuevo ──► CNI · Entrada Telegram (única entrada del bot: dedupe, lista blanca, guardrail)
                          │
Panel (Pages) ──► agente ElevenLabs ──► herramienta gestionar_caso (POST con header secreto)
                          │                      │
                          ▼                      ▼
                    CNI · Procesar caso  ◄── CNI · Voz API (valida campos, guardrail)
                    (folio COT-AAAAMMDD-NNN, registro, notificaciones, costos)
                          │
                          ▼
                    CNI · Orquestador (control determinista + carga de skills)
                      ├─ Agente 1 Intake      → requerimiento o aclaración
                      ├─ Agente 2 Catálogo    → SKUs con fuente (servidor verifica existencia y stock)
                      ├─ Agente 3 Cotizador   → calculadora determinista + supuestos (skill cotizar)
                      └─ Agente 4 Revisor     → reglas + revisión (skill revisar); DEVUELTO ⇒ nueva versión (máx. 3)
                          │   cada llamada pasa por CNI · Llamada LLM (loop seguridad-costo)
                          ▼
                    PENDIENTE_APROBACION ──► botones en Telegram (gerencia, nonce + versión, 15 min)
                          │
                          ▼
                    APROBADO / RECHAZADO / EXPIRADO ──► notificación (resultado simulado)
                          │
                          ▼
CNI · Exportación sanitizada ──► GitHub Actions (pruebas + controles) ──► GitHub Pages
```

Diagrama detallado: `docs/arquitectura.md`.

## Dónde corre cada componente

| Componente | Dónde corre | Configuración |
|---|---|---|
| Bot de Telegram | Telegram Bot API | @BotFather; token solo en la credencial de n8n |
| 7 workflows (orquestador y 4 agentes incluidos) | n8n Cloud Starter, versión 2.49.5 | `n8n/workflows/*.json` (generados con `n8n/build.js`) |
| Modelo de los agentes | Anthropic API, `claude-haiku-5-5`, thinking desactivado, effort low | Credencial Header Auth `x-api-key` |
| Registro de casos, costos, eventos y usuarios | n8n Data tables (privadas) | `n8n/tablas.md`, `datos/diccionario_datos.md` |
| Skills | `skills/*/SKILL.md` en la rama `main`; los carga el orquestador en cada caso | `skills/` |
| Panel | GitHub Pages (estático) | `web/index.html`, `web/data/panel.json` |
| Validación y despliegue | GitHub Actions | `.github/workflows/validar-y-publicar.yml` |
| Agente de voz | ElevenLabs Agents (plan Starter) | `elevenlabs/agente.md` |

## Requisitos y versiones verificadas

| Elemento | Versión o plan | Cómo se verificó |
|---|---|---|
| n8n | Cloud 2.49.5, Starter (2,500 ejecuciones/mes) | Panel de la instancia, 24-nov-2026 |
| Nodos de n8n | dataTable 1.1, code 2, httpRequest 4.2, if 2.2, switch 3.2, telegram 1.2, telegramTrigger 1.2, webhook 2, executeWorkflow 1.2 | Esquemas de `n8n-nodes-base@2.49.5` |
| Modelo | claude-haiku-5-5 (0.10 / 0.50 USD por MTok) | Documentación de precios de Anthropic, 24-nov-2026 |
| Node.js (pruebas y Actions) | 20 | `actions/setup-node@v4` |
| ElevenLabs | Agents, plan Starter, LLM DeepSeek Flash 4.1 | Panel de ElevenLabs |

## Credenciales (por nombre, nunca valores)

| Nombre | Tipo | Dónde vive | Usada por |
|---|---|---|---|
| `CNI Telegram bot` | Telegram API | n8n | Telegram Trigger y nodos de envío |
| `CNI Anthropic (x-api-key)` | Header Auth, restringida a `api.anthropic.com` | n8n | CNI · Llamada LLM |
| `CNI Voz (x-cni-voz)` | Header Auth | n8n y secreto `cni_voz_n8n` en ElevenLabs | Webhook /cni-voz |
| `CNI Export (x-cni-export)` | Header Auth | n8n y secreto `N8N_EXPORT_SECRET` en GitHub | Webhook /cni-export |
| `N8N_EXPORT_URL` | Secreto de Actions | GitHub | Descarga de la exportación |

`.env.example` lista estos nombres sin valores. `scripts/validar_publicacion.js` falla si encuentra tokens, claves, chat_id, seudónimos o correos en lo que se publica o en los workflows exportados.

## Estructura

```
README.md · .env.example · .gitignore
src/core.js                  núcleo determinista: cálculos, revisor por reglas, guardrails, presupuesto, aprobación, exportación
agentes/                     instrucciones de los 5 roles y contratos JSON (entrada, salida, traza)
skills/                      cotizar-material-electrico y revisar-cotizacion (SKILL.md + ejemplos)
loops/README.md              loop de calidad y loop de seguridad-costo, límites y autoevaluación
n8n/build.js · workflows/    generador y 7 workflows exportados sin secretos
n8n/tablas.md                diseño de tablas privadas
elevenlabs/                  configuración del agente de voz y base de conocimiento
web/                         panel (index.html) y data/panel.json sanitizado
scripts/validar_publicacion.js  controles previos al despliegue
tests/test_core.js · pruebas.csv  36 pruebas automáticas y matriz P01–P14
datos/                       catálogo, políticas y diccionario de datos (ficticios)
costos/                      tarifas, costos.csv, resumen por caso, proyecciones y analisis.py
evidencias/                  índice, capturas y trazas sanitizadas
docs/                        informe, arquitectura, guion de demo y declaración de uso de IA
.github/workflows/           validar-y-publicar.yml
```

## Reproducir la instalación desde cero

1. **Telegram:** crear un bot con @BotFather (`/newbot`) y registrar `/setcommands` (`nuevo`, `estado`, `ayuda`).
2. **n8n:** crear las 6 tablas de `n8n/tablas.md` (Data tables). Importar `datos/catalogo.csv` y `datos/politicas.csv`.
3. Crear las 4 credenciales de la tabla anterior con los nombres exactos.
4. Importar los workflows en orden: `01` → `02` → `03` → `04`, `05`, `06`, `07`. Otra opción: ejecutar `node n8n/build.js ids.json` con los IDs reales para no tener que volver a elegir los sub-workflows (ver `n8n/README.md`). Volver a vincular las credenciales en los nodos marcados y **publicar** los 7.
5. Enviar `/start` al bot desde el usuario de prueba; el bot responde "no autorizado". Copiar su `chat_id` de la ejecución y agregarlo a `usuarios` (`seudonimo=GER-01`, `rol=gerente`, `activo=true`).
6. **ElevenLabs:** crear el agente con `elevenlabs/agente.md`. Agregar la herramienta webhook `gestionar_caso` con el secreto `x-cni-voz` y poner el dominio de Pages en la lista de permitidos. Pegar el `agent-id` en `web/index.html`.
7. **GitHub:** configurar Pages con la fuente "GitHub Actions" y crear los secretos `N8N_EXPORT_URL` y `N8N_EXPORT_SECRET`.

## Caso de prueba y resultado esperado

Enviar al bot:

```
/nuevo Cotización para Taller Eléctrico Ruiz: 250 contactos dúplex, 12 rollos de cable THW calibre 12 rojo y 60 pastillas de 20 amperes
```

Resultado esperado (verificado con COT-20261124-002 y COT-20261124-010):
- Folio recibido.
- V1 aplica 8 % a ACC-CON-DUP y el revisor la **devuelve** porque el margen queda en 16.30 %.
- V2 baja el descuento a 6 %, el margen sube a 18.09 % y el revisor la **aprueba**.
- Subtotal 36,375.00 + IVA 5,820.00 = **42,195.00 MXN**.
- La gerencia recibe botones Aprobar / Rechazar (vencen en 15 min).
- Al aprobar llega "RESULTADO SIMULADO: se registra como enviada al cliente".

`/estado COT-AAAAMMDD-NNN` consulta el registro. Por voz: "consulta el folio …" o "registra una cotización para …".

## Validación

```bash
node tests/test_core.js                # 36 pruebas deterministas (cálculos, reglas, guardrails, presupuesto, aprobación, exportación)
node scripts/validar_publicacion.js    # estructura, recálculo de KPI y ausencia de datos sensibles
python3 costos/analisis.py             # regenera costos.csv, resúmenes y proyecciones
```

Actions corre las dos primeras antes de publicar, así que un error real bloquea el despliegue (P12). La matriz P01–P14 y sus evidencias están en `tests/pruebas.csv` y `evidencias/README.md`.

## Actualización de datos del panel

- **Mecanismo:** GitHub Actions llama a `GET /webhook/cni-export` (Header Auth). n8n arma los agregados con `exportarPanel()`, que es la misma función probada. Actions valida y publica.
- **Frecuencia:** cada 6 horas, en cada push y manualmente (`workflow_dispatch`).
- **Retraso esperado:** hasta 6 horas más ~1 minuto de despliegue. Si la exportación falla, se publica la última copia versionada y el panel avisa cuando los datos tienen más de 24 horas.

## Iniciar, detener y mantener disponible

- **Iniciar:** n8n Cloud mantiene la instancia encendida 24/7. Revisar en `app.n8n.cloud` → Overview que diga "Online" y que los 7 workflows estén publicados.
- **Detener:** despublicar "CNI · Entrada Telegram" y "CNI · Voz API". Las otras entradas no reciben tráfico externo.
- **Cuota:** solo cuentan las ejecuciones de producción de los workflows principales (los sub-workflows no cuentan). La expiración corre cada hora y el vencimiento se aplica también de forma "perezosa" al consultar.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El bot no responde | "CNI · Entrada Telegram" sin publicar o con otro receptor del mismo bot | Publicar el workflow; no usar polling ni otro webhook para ese bot |
| "Usuario no autorizado" | Falta su `chat_id` en `usuarios` o `activo=false` | Agregar la fila |
| "Se detuvo por un error del servicio" | Fallo de la API de Anthropic, crédito agotado o modelo inválido en `politicas.modelo` | Revisar la ejecución de "CNI · Llamada LLM" y el saldo |
| "Se detuvo por un límite de control" | `limite_costo_usd_caso`, `max_llamadas_llm_caso` o `tiempo_max_caso_seg` | Revisar `casos.motivo` |
| La voz no llama a la herramienta | Secreto `x-cni-voz` distinto o webhook sin publicar | Revisar la herramienta en ElevenLabs y "CNI · Voz API" |
| El widget no aparece | Dominio fuera de la lista de permitidos, micrófono bloqueado o cuota agotada | Revisar Seguridad del agente y el candado del navegador |
| El panel no se actualiza | Secretos de Actions o webhook de exportación | Ver el log del paso "Obtener exportación" |

## Uso de IA y fuentes

Se usó Claude (Anthropic) como asistente de desarrollo: diseño, código, documentación y operación del navegador. El estudiante revisó, probó y puede explicar cada componente. El detalle está en `docs/declaracion_uso_ia.md`. Los datos son ficticios; las fuentes de tarifas están en `costos/tarifas.csv`.
