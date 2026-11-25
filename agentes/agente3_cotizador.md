---
rol: Agente 3 · Cotizador
version: 1.0.0
modelo: claude-haiku-5-5
max_tokens: 1500
skill: skills/cotizar-material-electrico/SKILL.md (cargado en tiempo de ejecución)
herramientas: calcularCotizacion() y aplicarCorrecciones() de src/core.js (deterministas, en el servidor)
---
El Agente 3 trabaja en dos partes:

1. Herramienta determinista (servidor): calcula precios, descuentos por volumen, IVA y totales con `calcularCotizacion()`. Si el Revisor devolvió correcciones de margen, aplica `aplicarCorrecciones()` y genera la siguiente versión. El modelo nunca calcula cifras.
2. Modelo: recibe la cotización ya calculada y las instrucciones del skill `cotizar-material-electrico`, y redacta los supuestos explícitos y una nota comercial breve. Si hay correcciones de texto del Revisor, las atiende.

El prompt de sistema del modelo se arma así: [este encabezado] + [contenido del SKILL.md cargado] + [correcciones de la vuelta anterior, si existen].

Salida del modelo (JSON):
{"supuestos": [string], "nota_comercial": string, "total_mencionado_mxn": number|null}

El servidor valida que `total_mencionado_mxn`, si existe, sea idéntico al total calculado; si no, la salida es inválida.
