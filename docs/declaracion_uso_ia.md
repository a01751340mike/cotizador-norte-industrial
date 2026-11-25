# Declaración de uso de IA

| Herramienta | Uso | Revisión del estudiante |
|---|---|---|
| Claude (Anthropic, app claude.ai con navegador) | Lectura de la guía; diseño de arquitectura; código de `src/core.js`, `n8n/build.js`, panel, Actions y scripts; redacción de prompts, skills, loops y documentación; configuración en n8n, Telegram, ElevenLabs y GitHub desde el navegador del estudiante; ejecución de pruebas | El estudiante decidió el caso, los pagos de plataformas y las credenciales (capturadas por él), revisó resultados en Telegram y en el panel, y aprobó o rechazó los casos de prueba |
| Claude Haiku 5.5 (API) | Agentes 1–4 en operación | Salidas validadas por reglas del servidor antes de usarse |
| ElevenLabs Agents (DeepSeek Flash 4.1) | Interfaz de voz | Prompt y herramienta configurados; respuestas solo desde la herramienta |

- Ninguna credencial fue escrita por la IA: el estudiante las capturó en formularios preparados.
- Costos de desarrollo: la app no reporta tokens. Se registran como desconocidos en `costos/costos.csv` (fila DESARROLLO), no como cero.
- Fuentes y licencias: datos ficticios propios; documentación oficial citada en `costos/tarifas.csv` y en el informe. No se usaron imágenes ni recursos de terceros en el panel.
