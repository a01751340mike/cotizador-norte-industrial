# Resumen de costos (generado por `costos/analisis.py`)

Tarifas: Claude Haiku 5.5 0.1 USD/MTok entrada y 0.5 USD/MTok salida (≤100k tokens). TC 18.4677 MXN/USD (FIX Banxico 17-nov-2026); EUR/USD 1.1.

## Operación medida (40 llamadas al modelo, 13 casos)

- Costo total de llamadas al modelo: **0.014859 USD** (0.2744 MXN).
- C promedio por caso completo (5 casos: 002, 004, 005, 010, 013): **0.001839 USD/caso** (0.0340 MXN).
- Casos fallidos reportados aparte (001, 003, 008, 012): 0.004345 USD (no se ocultan en el promedio).
- Voz: 1 conversación de 113 s y 89 créditos ≈ 0.0178 USD (incluido en el plan).

### Por etapa y agente

| Etapa | Agente | USD |
|---|---|---|
| agente | agente1_intake | 0.001700 |
| agente | agente2_catalogo | 0.003306 |
| agente | agente3_cotizador | 0.007604 |
| elevenlabs | voz | 1.017800 |
| revision | agente4_revisor | 0.002249 |
| telegram_n8n | no aplica | 26.400000 |

## Optimización: pensamiento desactivado + esfuerzo bajo (misma solicitud, misma ruta V1→V2)

| Métrica | Antes (COT-002) | Después (COT-010) | Cambio |
|---|---|---|---|
| Tokens de entrada | 10,156 | 10,175 | +19 |
| Tokens de salida | 2,490 | 1,045 | -58 % |
| Costo del caso (USD) | 0.002261 | 0.001540 | -32 % |
| Tiempo en el modelo (s) | 12.3 | 6.1 | -50 % |
| Calidad | Total 42,195.00, V1 devuelta, V2 aprobada | Idéntico | sin cambio |

Los controles no se tocaron: las reglas del revisor, el presupuesto y la aprobación humana siguen activos. También dejaron de truncarse respuestas (los errores de COT-001, 003 y 008 venían del razonamiento que consumía max_tokens).

## Proyección mensual

Supuestos: mezcla de rutas 60 % V1 / 30 % V2 / 10 % se detiene antes; 20 % de casos por voz (2 min base, 3.5 min alto); 3 ejecuciones de n8n por caso (los sub-workflows no cuentan) + 840 fijas (expiración horaria y exportación cada 6 h). No se extrapola el primer mes con descuento de ElevenLabs: se usa precio regular. Se elige el plan mínimo que cubre el volumen (escalones, no lineal).

| Casos/mes | Escenario | LLM USD/caso | LLM variable USD | Plan n8n | Plan voz | Fijos USD | Total USD | Total MXN | USD/caso |
|---|---|---|---|---|---|---|---|---|---|
| 100 | base | 0.001122 | 0.11 | n8n 2,500 ejec. (24 EUR) | ElevenLabs 75 min (6 USD) | 32.4 | 32.51 | 600.43 | 0.3251 |
| 100 | alto consumo | 0.003391 | 0.34 | n8n 2,500 ejec. (24 EUR) | ElevenLabs 75 min (6 USD) | 32.4 | 32.74 | 604.62 | 0.3274 |
| 1,000 | base | 0.001122 | 1.12 | n8n 10,000 ejec. (60 EUR) | ElevenLabs 1,238 min (99 USD) | 165.0 | 166.12 | 3,067.89 | 0.1661 |
| 1,000 | alto consumo | 0.003391 | 3.39 | n8n 10,000 ejec. (60 EUR) | ElevenLabs 1,238 min (99 USD) | 165.0 | 168.39 | 3,109.79 | 0.1684 |
| 10,000 | base | 0.001122 | 11.22 | n8n 50,000 ejec. (144 EUR) | ElevenLabs 12,375 min (990 USD) | 1148.4 | 1159.62 | 21,415.49 | 0.116 |
| 10,000 | alto consumo | 0.003391 | 33.91 | n8n 50,000 ejec. (144 EUR) | ElevenLabs 12,375 min (990 USD) | 1148.4 | 1182.31 | 21,834.53 | 0.1182 |

Lectura: el costo del modelo es marginal (menos de 2 USD por cada 1,000 casos). Lo que domina son las plataformas: la voz pasa a ser el costo principal desde 1,000 casos al mes. Para escalar conviene limitar la duración de las llamadas de voz, mandar a Telegram las consultas de estado, o comparar con n8n autohospedado cuando se pase de 10,000 casos.

Incertidumbre: los créditos de ElevenLabs incluyen el LLM del agente como pass-through y el panel no separa el costo en USD. El valor por crédito se estima con el precio del plan. El desarrollo con Claude no reporta tokens: se declara como desconocido, no como cero.
