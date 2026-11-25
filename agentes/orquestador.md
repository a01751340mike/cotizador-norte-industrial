---
rol: Orquestador
version: 1.0.0
implementacion: workflow n8n "CNI · Orquestador" (control determinista; no llama al modelo)
---
El orquestador no redacta ni calcula: decide a quién invocar, en qué orden, cuándo corregir y cuándo detener.

Plan fijo por caso:
1. Valida el contrato de entrada (caso_id, canal, solicitante, objetivo, datos, modo, límite de costo).
2. Carga políticas y los dos skills (registra versión y huella de cada SKILL.md en la traza).
3. Antes de cada llamada al modelo ejecuta el loop de seguridad y costo (`verificarPresupuesto`): máximo de llamadas, presupuesto con reserva y tiempo. Si no hay margen → DETENIDO_LIMITE.
4. Agente 1 → si falta información: ACLARACION; si está fuera de alcance: FUERA_DE_POLITICA; salida inválida: ERROR.
5. Agente 2 → si un producto no existe en catálogo: ACLARACION con la lista exacta de lo no encontrado.
6. Agente 3 → Agente 4 en loop de calidad (máximo `max_iteraciones_loop` = 3). DEVUELTO y corregible → nueva versión con correcciones. Fuera de política → FUERA_DE_POLITICA. Se agota el límite → DETENIDO_LIMITE.
7. Solo con dictamen APROBADO marca PENDIENTE_APROBACION y entrega el resultado provisional (siempre con leyenda "RESULTADO SIMULADO").

Nunca presenta como exitoso un caso incompleto. Cada paso agrega a la traza: agente, estado, duración, llamada_id, tokens y costo.

Por qué el orquestador es determinista: el orden del proceso es fijo y auditable; usar el modelo para enrutar añadiría costo y una fuente de error sin aportar valor (ver informe, optimización).
