# Cotizador Norte Industrial

Proyecto final individual de AI Tools. Sistema de agentes que recibe solicitudes de cotización por Telegram o por voz, las procesa con un orquestador y cuatro agentes, pide aprobación humana y publica indicadores sanitizados.

> **Datos ficticios · Modo SIMULADO.** Distribuidora Norte Industrial es una empresa inventada. Ninguna cotización llega a un cliente real.

Autor: Miguel Ángel Morales Azamar

## Estado del proyecto

| Hito | Estado |
|---|---|
| 1. Definir | Completo: documento base del caso |
| 2. Preparar | En curso |
| 3. Construir agentes | Pendiente |
| 4. Conectar Telegram | Pendiente |
| 5. Controlar | Pendiente |
| 6. Publicar | Pendiente |
| 7. Integrar voz | Pendiente |
| 8. Medir y entregar | Pendiente |

## Dónde corre cada componente

| Componente | Dónde corre | Notas |
|---|---|---|
| Bot de Telegram | Telegram | Bot exclusivo del proyecto; una sola entrada (Telegram Trigger) |
| Orquestador y 4 agentes | n8n Cloud | Sub-workflows; modelo Anthropic |
| Registro de casos, costos y eventos | n8n Cloud (Data Tables privadas) | Nunca se publica completo |
| Panel web | GitHub Pages | Solo archivos estáticos y datos sanitizados |
| Validación y despliegue | GitHub Actions | Publica solo si pasan los controles |
| Agente de voz | ElevenLabs | Widget en index.html; herramienta de servidor hacia n8n |

## Requisitos

- Cuenta de Telegram para crear el bot y probarlo.
- n8n Cloud accesible por HTTPS.
- Cuenta de Anthropic con API key y saldo.
- Cuenta de ElevenLabs con minutos de agente disponibles.
- Cuenta de GitHub con Pages y Actions.

## Versiones y modelos

| Elemento | Versión | Verificado |
|---|---|---|
| Modelo de los 5 roles | claude-haiku-5-5 (previsto) | Pendiente de confirmar en el nodo Anthropic de n8n |
| n8n | Cloud, versión de la cuenta | Pendiente |
| Agente de voz | ElevenLabs Agents | Pendiente |

Una versión se marca como verificada solo si se probó o se contrastó con su documentación.

## Credenciales (por nombre, sin valores)

Ningún valor de credencial se guarda en este repositorio. Ver `.env.example`.

| Credencial | Dónde vive | Configurada |
|---|---|---|
| TELEGRAM_BOT_TOKEN | Credencial "Telegram API" en n8n Cloud | [ ] |
| ANTHROPIC_API_KEY | Credencial "Anthropic API" en n8n Cloud | [ ] |
| N8N_VOZ_WEBHOOK_SECRET | Header Auth en n8n y herramienta de servidor en ElevenLabs | [ ] |
| ELEVENLABS_AGENT_ID | index.html (identificador público, no es secreto) | [ ] |

## Estructura

```
README.md
.env.example        nombres de variables, sin valores
docs/               documento base, informe, arquitectura y manual
web/                index.html y recursos del panel
agentes/            instrucciones y contratos de los 5 roles
n8n/                workflows exportados y diseño de tablas
skills/             dos skills con SKILL.md
loops/              reglas y evidencia de los loops
tests/              matriz de pruebas
datos/              catálogo y políticas ficticias
costos/             tarifas y registro de costos
evidencias/         índice de evidencias
.github/workflows/  validación y despliegue
```

## Instalación y configuración

Se completa conforme avanzan los hitos. Pasos previstos:

1. Crear el bot en @BotFather y guardar el token como credencial en n8n.
2. Crear la credencial de Anthropic en n8n.
3. Crear las tablas de `n8n/tablas.md` e importar `datos/catalogo.csv` y `datos/politicas.csv`.
4. Importar los workflows de `n8n/` y volver a vincular las credenciales.
5. Activar el workflow con su URL de producción.

## Caso de prueba y resultado esperado

Solicitud por Telegram: «Cotización para Taller Eléctrico Ruiz: 250 contactos dúplex, 12 rollos de cable THW calibre 12 rojo y 60 pastillas de 20 amperes».

Resultado esperado: V1 devuelta por margen bajo en ACC-CON-DUP; V2 con descuento de 6 % en esa línea; total de 42,195.00 MXN; estado PENDIENTE_APROBACION.

## Validación, parada y solución de problemas

Se completa en los Hitos 4 a 8.

## Uso de IA

Este proyecto se desarrolló con apoyo de Claude (Anthropic) para diseño, documentación y código. Todo lo generado se revisó; el detalle se declara en el informe final.
