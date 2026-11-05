# Registro de costos

- `tarifas.csv`: tarifas con fuente oficial y fecha de consulta.
- `costos.csv`: una fila por llamada o cargo. Se llena con la tabla privada `costos` de n8n.

Fórmula por llamada (guía, página 9):

C = (T_entrada × P_entrada + T_salida × P_salida) / 1 000 000

## Columnas de costos.csv

| Columna | Qué va |
|---|---|
| fecha_hora | Fecha y hora de la llamada (ISO 8601) |
| caso_id | Folio del caso; DESARROLLO para el uso de IA al construir |
| llamada_id | Identificador único de la llamada |
| etapa | diseno, telegram_n8n, orquestacion, agente, skill_loop, elevenlabs, revision, publicacion |
| agente | orquestador, agente1, agente2, agente3, agente4, voz o no aplica |
| proveedor | Anthropic, ElevenLabs, n8n, GitHub, Telegram |
| modelo | Modelo o versión exacta |
| tokens_entrada | Tokens facturables de entrada (vacío si no aplica, nunca 0 si es desconocido) |
| tokens_salida | Tokens facturables de salida |
| tokens_cache | Tokens leídos de caché, si aplica |
| duracion_voz_seg | Segundos de conversación de voz |
| unidad_cobro | tokens, minutos, plan mensual |
| tarifa_entrada_usd_mtok | Tarifa usada para la entrada |
| tarifa_salida_usd_mtok | Tarifa usada para la salida |
| costo_usd | Resultado de la fórmula |
| moneda | USD |
| estado | exito, error, reintento |
| reintento | Número de reintento (0 si es el primero) |
| origen_dato | medido (reportado por el proveedor) o estimado (explicar método) |
