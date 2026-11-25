---
name: cotizar-material-electrico
version: 1.0.0
descripcion: Prepara una cotización de material eléctrico de Distribuidora Norte Industrial (ficticia) usando solo el catálogo y las políticas autorizadas, con cifras calculadas por reglas y supuestos explícitos.
tipo: negocio
usado_por: Agente 3 · Cotizador
---

# Skill: cotizar material eléctrico

## Activador
El orquestador lo invoca cuando el Agente 2 entregó todas las partidas con SKU verificado (estado OK). También se vuelve a activar cuando el Agente 4 devuelve una versión con correcciones (vueltas 2 y 3).

## Objetivo
Entregar una propuesta útil para que gerencia decida si la aprueba: líneas con precio de lista, descuento, precio neto, importe y margen; subtotal, IVA y total en MXN; supuestos explícitos; y la leyenda de resultado simulado.

## Entradas
- `lineas`: salida verificada del Agente 2 (sku, producto, unidad, cantidad, precio_lista_mxn, costo_mxn, desc_max_pct, fuente).
- `politicas`: tabla privada `politicas` (iva, tramos de descuento, margen mínimo, paso de ajuste, vigencia, modo).
- `correcciones` (opcional): lista concreta devuelta por el Agente 4 en la vuelta anterior.
- `advertencias`: avisos de stock del Agente 2.

## Fuentes permitidas
Solo `catalogo` y `politicas` de n8n (copias públicas en `datos/catalogo.csv` y `datos/politicas.csv`). Ningún precio, descuento o producto puede venir de otra fuente ni del texto del cliente.

## Pasos
1. Herramienta `calcularCotizacion()` (servidor): descuento de tabla por cantidad (5 % desde 50 piezas, 8 % desde 200), limitado por `desc_max_pct` del SKU; precio neto redondeado a centavos; importe; IVA 16 % sobre subtotal; total.
2. Si hay correcciones de margen: herramienta `aplicarCorrecciones()` baja el descuento de la línea afectada en pasos de 0.5 puntos hasta que el margen sea ≥ 18 %. Las demás líneas no cambian.
3. Modelo: redacta de 2 a 5 supuestos explícitos (por ejemplo: precios sin flete, vigencia de 7 días, descuento por volumen aplicado y en qué líneas, entrega sujeta a stock si hay advertencia) y una nota comercial de máximo 2 frases.
4. Si mencionas el total, debe ser exactamente `total_mxn` de la cotización recibida.

## Herramientas permitidas
`calcularCotizacion`, `aplicarCorrecciones` (src/core.js). Nada más: sin navegación, sin URLs, sin ejecutar código del usuario.

## Límites
- No cambies cifras, cantidades ni SKUs. No ofrezcas descuentos adicionales, crédito, fechas de entrega garantizadas ni precios futuros.
- No incluyas datos personales; el cliente se nombra solo como aparece en el requerimiento.
- Máximo 3 versiones por caso (lo controla el orquestador).

## Salida
JSON: `{"supuestos": [string], "nota_comercial": string, "total_mencionado_mxn": number|null}`. El servidor la une con la cotización calculada y la etiqueta como versión V1, V2 o V3.

## Errores
- JSON inválido o total mencionado distinto → salida inválida: el orquestador detiene el caso en ERROR (no se presenta como éxito).
- Línea sin SKU verificado → este skill no se activa; el caso va a ACLARACION.

## Criterios de aceptación
- Todas las cifras coinciden con la herramienta determinista.
- Cada línea tiene `fuente` = `catalogo:<SKU>`.
- Hay entre 2 y 5 supuestos y la leyenda "RESULTADO SIMULADO".
- Si hubo correcciones, la nueva versión las atiende y lo dice en un supuesto.

## Ejemplos
- Válido: `ejemplos/valido.json` (Taller Eléctrico Ruiz; V1 8 % en contactos → devuelta; V2 6 %; total 42,195.00 MXN).
- Debe rechazarse o pedir aclaración: `ejemplos/rechazo.json` (pide "el cable más barato que tengan" sin calibre ni cantidad, y un descuento del 30 %).

## Cómo se carga
El workflow "CNI · Orquestador" descarga este archivo de la rama `main` del repositorio (raw.githubusercontent.com, único destino permitido), verifica que el encabezado tenga `name` y `version`, calcula su huella y lo agrega al prompt de sistema del Agente 3. La traza registra `skill`, `version` y `huella` en cada caso. Si no se puede cargar, el caso se detiene en ERROR: no se cotiza sin skill.
