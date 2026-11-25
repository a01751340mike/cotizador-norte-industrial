#!/usr/bin/env python3
"""
Genera el registro de costos auditable y las proyecciones del proyecto.
Entrada: costos/llamadas_medidas.txt (exportación de la tabla privada "costos" de n8n),
         costos/tarifas.csv y los supuestos declarados abajo.
Salida:  costos/costos.csv, costos/resumen_por_caso.csv, costos/proyecciones.csv, costos/RESUMEN.md
Uso:     python3 costos/analisis.py
Fórmula por llamada (guía p. 9): C = (Tin*Pin + Tout*Pout) / 1,000,000
"""
import csv, os, statistics
from collections import defaultdict

D = os.path.dirname(os.path.abspath(__file__))
P_IN, P_OUT = 0.10, 0.50            # USD por millón de tokens · Claude Haiku 5.5 (≤100k tokens), consulta 2026-11-04 y 2026-11-24
TC_MXN_USD = 18.4677                # FIX Banxico determinado 17-nov-2026 (publicado DOF 18-nov-2026)
EUR_USD = 1.10                      # EUR/USD interbancario ~19-nov-2026
ERRORES = {'001-L3', '003-L4', '008-L3', '012-L1'}   # respuestas truncadas (max_tokens) o API caída (P08)
AGENTES = {'1': 'agente1_intake', '2': 'agente2_catalogo', '3': 'agente3_cotizador', '4': 'agente4_revisor'}
FECHA = '2026-11-25T'

def costo(tin, tout):
    return (tin * P_IN + tout * P_OUT) / 1e6

# ---------- 1. llamadas medidas ----------
filas = []
for linea in open(os.path.join(D, 'llamadas_medidas.txt'), encoding='utf8'):
    if linea.startswith('#') or not linea.strip():
        continue
    hora, ll, ag, ver, tin, tout, tc, dur = linea.split()
    caso = 'COT-20261124-' + ll.split('-')[0]
    medido = tin != '-'
    tin_i, tout_i = (int(tin), int(tout)) if medido else (None, None)
    filas.append({
        'fecha_hora': FECHA + hora + 'Z', 'caso_id': caso, 'llamada_id': caso + '-' + ll.split('-')[1],
        'etapa': 'revision' if ag == '4' else 'agente', 'agente': AGENTES[ag], 'version': ver,
        'proveedor': 'Anthropic', 'modelo': 'claude-haiku-5-5', 'tokens_entrada': tin_i, 'tokens_salida': tout_i,
        'tokens_cache': 0 if medido else None, 'duracion_voz_seg': None, 'unidad_cobro': 'tokens',
        'tarifa': f'{P_IN} in / {P_OUT} out USD/MTok',
        'costo_usd': round(costo(tin_i, tout_i), 7) if medido else 0.0, 'moneda': 'USD',
        'estado': 'error' if ll in ERRORES else 'exito', 'reintento': 0,
        'origen_dato': 'medido (usage reportado por Anthropic)' if medido else 'sin uso reportado: la API respondió error (no facturable)',
        'duracion_ms': int(dur),
    })

# ---------- 2. cargos que no son tokens (se registran sin atribuirles tokens) ----------
extra = [
    {'fecha_hora': '2026-11-25T02:28:06Z', 'caso_id': 'COT-20261124-013', 'llamada_id': 'conv_8601m888g7xhff9tx70ed63850tf', 'etapa': 'elevenlabs', 'agente': 'voz',
     'proveedor': 'ElevenLabs', 'modelo': 'ElevenAgents (LLM DeepSeek Flash 4.1, pass-through)', 'tokens_entrada': None, 'tokens_salida': None, 'tokens_cache': None,
     'duracion_voz_seg': 113, 'unidad_cobro': 'créditos del plan (duración + mensajes de texto + LLM)', 'tarifa': 'Starter: 6 USD/mes (1er mes 1 USD), 75 min incluidos',
     'costo_usd': round(89 * 6 / 30000, 5), 'moneda': 'USD', 'estado': 'exito', 'reintento': 0,
     'origen_dato': 'medido: 89 créditos en el panel de ElevenLabs; valor en USD estimado = 89 × (6 USD / 30,000 créditos del plan Starter); incluido en el plan (sin cargo adicional)', 'duracion_ms': 113000},
    {'fecha_hora': '2026-11-25T02:00:00Z', 'caso_id': 'PLATAFORMA', 'llamada_id': 'n8n-starter-mensual', 'etapa': 'telegram_n8n', 'agente': 'no aplica',
     'proveedor': 'n8n', 'modelo': 'n8n Cloud Starter 2.49.5', 'tokens_entrada': None, 'tokens_salida': None, 'tokens_cache': None, 'duracion_voz_seg': None,
     'unidad_cobro': 'plan mensual (2,500 ejecuciones de producción)', 'tarifa': '24 EUR/mes', 'costo_usd': round(24 * EUR_USD, 2), 'moneda': 'USD', 'estado': 'exito', 'reintento': 0,
     'origen_dato': 'cargo fijo pagado (Overview de n8n Cloud); tokenización no aplica', 'duracion_ms': None},
    {'fecha_hora': '2026-11-25T02:00:00Z', 'caso_id': 'PLATAFORMA', 'llamada_id': 'telegram-bot-api', 'etapa': 'telegram_n8n', 'agente': 'no aplica',
     'proveedor': 'Telegram', 'modelo': 'Bot API', 'tokens_entrada': None, 'tokens_salida': None, 'tokens_cache': None, 'duracion_voz_seg': None,
     'unidad_cobro': 'mensajes', 'tarifa': 'gratuito', 'costo_usd': 0.0, 'moneda': 'USD', 'estado': 'exito', 'reintento': 0,
     'origen_dato': 'sin cargo; tokenización no aplica', 'duracion_ms': None},
    {'fecha_hora': '2026-11-25T02:00:00Z', 'caso_id': 'PLATAFORMA', 'llamada_id': 'github-pages-actions', 'etapa': 'publicacion', 'agente': 'no aplica',
     'proveedor': 'GitHub', 'modelo': 'Pages + Actions (repositorio público)', 'tokens_entrada': None, 'tokens_salida': None, 'tokens_cache': None, 'duracion_voz_seg': None,
     'unidad_cobro': 'minutos de Actions', 'tarifa': 'incluido para repositorios públicos', 'costo_usd': 0.0, 'moneda': 'USD', 'estado': 'exito', 'reintento': 0,
     'origen_dato': '~30 s por corrida (ver Actions); tokenización no aplica', 'duracion_ms': None},
    {'fecha_hora': '2026-11-25T02:00:00Z', 'caso_id': 'PLATAFORMA', 'llamada_id': 'elevenlabs-starter-mensual', 'etapa': 'elevenlabs', 'agente': 'voz',
     'proveedor': 'ElevenLabs', 'modelo': 'Plan Starter', 'tokens_entrada': None, 'tokens_salida': None, 'tokens_cache': None, 'duracion_voz_seg': None,
     'unidad_cobro': 'plan mensual', 'tarifa': '6 USD/mes (primer mes 1 USD)', 'costo_usd': 1.0, 'moneda': 'USD', 'estado': 'exito', 'reintento': 0,
     'origen_dato': 'cargo fijo pagado (primer mes con descuento)', 'duracion_ms': None},
    {'fecha_hora': '2026-11-24T19:20:00Z', 'caso_id': 'DESARROLLO', 'llamada_id': 'claude-desarrollo', 'etapa': 'diseno', 'agente': 'no aplica',
     'proveedor': 'Anthropic', 'modelo': 'Claude (app claude.ai del estudiante)', 'tokens_entrada': None, 'tokens_salida': None, 'tokens_cache': None, 'duracion_voz_seg': None,
     'unidad_cobro': 'suscripción del estudiante', 'tarifa': 'plan de la cuenta', 'costo_usd': None, 'moneda': 'USD', 'estado': 'exito', 'reintento': 0,
     'origen_dato': 'DESCONOCIDO: la app no reporta tokens; inversión de desarrollo separada de la operación (no es cero)', 'duracion_ms': None},
]
todas = filas + extra
COLS = ['fecha_hora', 'caso_id', 'llamada_id', 'etapa', 'agente', 'version', 'proveedor', 'modelo', 'tokens_entrada', 'tokens_salida', 'tokens_cache',
        'duracion_voz_seg', 'unidad_cobro', 'tarifa', 'costo_usd', 'moneda', 'estado', 'reintento', 'origen_dato', 'duracion_ms']
with open(os.path.join(D, 'costos.csv'), 'w', newline='', encoding='utf8') as f:
    w = csv.DictWriter(f, fieldnames=COLS); w.writeheader()
    for r in todas:
        w.writerow({k: ('' if r.get(k) is None else r.get(k, '')) for k in COLS})

# ---------- 3. resumen por caso ----------
RESULTADO = {  # estado final según la tabla privada casos
    '001': ('ERROR', 'fallido'), '002': ('APROBADO', 'completo'), '003': ('ERROR', 'fallido'), '004': ('RECHAZADO', 'completo'),
    '005': ('EXPIRADO', 'completo'), '006': ('ACLARACION', 'rechazo/aclaración'), '007': ('BLOQUEADO', 'rechazo/aclaración'),
    '008': ('ERROR', 'fallido'), '009': ('FUERA_DE_POLITICA', 'rechazo/aclaración'), '010': ('APROBADO', 'completo'),
    '011': ('DETENIDO_LIMITE', 'rechazo/aclaración'), '012': ('ERROR', 'fallido'), '013': ('PENDIENTE_APROBACION (voz)', 'completo'),
}
por_caso = defaultdict(lambda: {'llamadas': 0, 'tin': 0, 'tout': 0, 'costo': 0.0, 'ms': 0})
for r in filas:
    c = por_caso[r['caso_id']]
    c['llamadas'] += 1; c['tin'] += r['tokens_entrada'] or 0; c['tout'] += r['tokens_salida'] or 0; c['costo'] += r['costo_usd']; c['ms'] += r['duracion_ms']
with open(os.path.join(D, 'resumen_por_caso.csv'), 'w', newline='', encoding='utf8') as f:
    w = csv.writer(f); w.writerow(['caso_id', 'estado_final', 'tipo', 'llamadas_llm', 'tokens_entrada', 'tokens_salida', 'costo_llm_usd', 'costo_voz_usd', 'costo_caso_usd', 'costo_caso_mxn', 'tiempo_llm_s'])
    for n in sorted(RESULTADO):
        cid = 'COT-20261124-' + n; c = por_caso.get(cid, {'llamadas': 0, 'tin': 0, 'tout': 0, 'costo': 0.0, 'ms': 0})
        voz = extra[0]['costo_usd'] if n == '013' else 0.0
        tot = c['costo'] + voz
        w.writerow([cid, RESULTADO[n][0], RESULTADO[n][1], c['llamadas'], c['tin'], c['tout'], round(c['costo'], 7), voz, round(tot, 7), round(tot * TC_MXN_USD, 5), round(c['ms'] / 1000, 1)])

# ---------- 4. métricas clave ----------
def caso_costo(n): return por_caso['COT-20261124-' + n]['costo']
completos = [n for n in RESULTADO if RESULTADO[n][1] == 'completo']
fallidos = [n for n in RESULTADO if RESULTADO[n][1] == 'fallido']
c_prom = statistics.mean(caso_costo(n) for n in completos)
c_fall = sum(caso_costo(n) for n in fallidos)
antes = por_caso['COT-20261124-002']; despues = por_caso['COT-20261124-010']
total_llm = sum(r['costo_usd'] for r in filas)
por_etapa = defaultdict(float)
for r in todas:
    if r['costo_usd']: por_etapa[(r['etapa'], r['agente'])] += r['costo_usd']

# ---------- 5. proyecciones mensuales ----------
# Mezcla de rutas declarada (base): 60 % aprobada por el revisor en V1, 30 % necesita V2, 10 % se detiene antes (aclaración/bloqueo/política).
RUTAS = {'V1': caso_costo('013'), 'V2': caso_costo('010'), 'corto': statistics.mean([caso_costo('006'), caso_costo('009'), caso_costo('011'), 0.0])}
mezcla_base = {'V1': .6, 'V2': .3, 'corto': .1}
llm_base = sum(RUTAS[k] * v for k, v in mezcla_base.items())
llm_alto = antes['costo'] * 1.5   # mayor consumo: pensamiento activado (como COT-002) y 50 % más vueltas/reintentos
VOZ_PCT, MIN_BASE, MIN_ALTO = 0.20, 2.0, 3.5   # 20 % de los casos por voz
EJEC_POR_CASO, EJEC_FIJAS = 3, 720 + 120          # /nuevo + botón + /estado; expiración horaria + export cada 6 h
N8N = [(2500, 24), (10000, 60), (50000, 144)]   # ejecuciones, EUR/mes
ELEVEN = [(15, 0), (75, 6), (275, 22), (1238, 99), (3738, 299), (12375, 990)]   # minutos incluidos, USD/mes
def plan(lista, req):
    for cap, precio in lista:
        if req <= cap: return cap, precio
    return lista[-1]
proy = []
for n in (100, 1000, 10000):
    for esc, llm, mins in (('base', llm_base, MIN_BASE), ('alto consumo', llm_alto, MIN_ALTO)):
        ej = n * EJEC_POR_CASO + EJEC_FIJAS; cap_n8n, eur = plan(N8N, ej)
        minutos = n * VOZ_PCT * mins; cap_v, usd_v = plan(ELEVEN, minutos)
        var_llm = n * llm
        fijo = eur * EUR_USD + usd_v
        total = var_llm + fijo
        proy.append([n, esc, round(llm, 6), round(var_llm, 2), ej, f'n8n {cap_n8n:,} ejec. ({eur} EUR)', round(minutos), f'ElevenLabs {cap_v:,} min ({usd_v} USD)',
                     round(fijo, 2), round(total, 2), round(total * TC_MXN_USD, 2), round(total / n, 4)])
with open(os.path.join(D, 'proyecciones.csv'), 'w', newline='', encoding='utf8') as f:
    w = csv.writer(f)
    w.writerow(['casos_mes', 'escenario', 'costo_llm_por_caso_usd', 'llm_variable_usd', 'ejecuciones_n8n', 'plan_n8n', 'minutos_voz', 'plan_voz', 'fijos_usd', 'total_usd', 'total_mxn', 'usd_por_caso'])
    w.writerows(proy)

# ---------- 6. RESUMEN.md ----------
L = []
L.append('# Resumen de costos (generado por `costos/analisis.py`)\n')
L.append(f'Tarifas: Claude Haiku 5.5 {P_IN} USD/MTok entrada y {P_OUT} USD/MTok salida (≤100k tokens). TC {TC_MXN_USD} MXN/USD (FIX Banxico 17-nov-2026); EUR/USD {EUR_USD}.\n')
L.append('## Operación medida (40 llamadas al modelo, 13 casos)\n')
L.append(f'- Costo total de llamadas al modelo: **{total_llm:.6f} USD** ({total_llm*TC_MXN_USD:.4f} MXN).')
L.append(f'- C promedio por caso completo ({len(completos)} casos: {", ".join(completos)}): **{c_prom:.6f} USD/caso** ({c_prom*TC_MXN_USD:.4f} MXN).')
L.append(f'- Casos fallidos reportados aparte ({", ".join(fallidos)}): {c_fall:.6f} USD (no se ocultan en el promedio).')
L.append(f'- Voz: 1 conversación de 113 s y 89 créditos ≈ {extra[0]["costo_usd"]} USD (incluido en el plan).\n')
L.append('### Por etapa y agente\n\n| Etapa | Agente | USD |\n|---|---|---|')
for (e, a), v in sorted(por_etapa.items()):
    L.append(f'| {e} | {a} | {v:.6f} |')
L.append('\n## Optimización: pensamiento desactivado + esfuerzo bajo (misma solicitud, misma ruta V1→V2)\n')
L.append('| Métrica | Antes (COT-002) | Después (COT-010) | Cambio |\n|---|---|---|---|')
L.append(f'| Tokens de entrada | {antes["tin"]:,} | {despues["tin"]:,} | {despues["tin"]-antes["tin"]:+,} |')
L.append(f'| Tokens de salida | {antes["tout"]:,} | {despues["tout"]:,} | {100*(despues["tout"]/antes["tout"]-1):.0f} % |')
L.append(f'| Costo del caso (USD) | {antes["costo"]:.6f} | {despues["costo"]:.6f} | {100*(despues["costo"]/antes["costo"]-1):.0f} % |')
L.append(f'| Tiempo en el modelo (s) | {antes["ms"]/1000:.1f} | {despues["ms"]/1000:.1f} | {100*(despues["ms"]/antes["ms"]-1):.0f} % |')
L.append('| Calidad | Total 42,195.00, V1 devuelta, V2 aprobada | Idéntico | sin cambio |')
L.append('\nLos controles no se tocaron: las reglas del revisor, el presupuesto y la aprobación humana siguen activos. También dejaron de truncarse respuestas (los errores de COT-001, 003 y 008 venían del razonamiento que consumía max_tokens).\n')
L.append('## Proyección mensual\n\nSupuestos: mezcla de rutas 60 % V1 / 30 % V2 / 10 % se detiene antes; 20 % de casos por voz (2 min base, 3.5 min alto); 3 ejecuciones de n8n por caso (los sub-workflows no cuentan) + 840 fijas (expiración horaria y exportación cada 6 h). No se extrapola el primer mes con descuento de ElevenLabs: se usa precio regular. Se elige el plan mínimo que cubre el volumen (escalones, no lineal).\n')
L.append('| Casos/mes | Escenario | LLM USD/caso | LLM variable USD | Plan n8n | Plan voz | Fijos USD | Total USD | Total MXN | USD/caso |\n|---|---|---|---|---|---|---|---|---|---|')
for p in proy:
    L.append(f'| {p[0]:,} | {p[1]} | {p[2]} | {p[3]} | {p[5]} | {p[7]} | {p[8]} | {p[9]} | {p[10]:,} | {p[11]} |')
L.append('\nLectura: el costo del modelo es marginal (menos de 2 USD por cada 1,000 casos). Lo que domina son las plataformas: la voz pasa a ser el costo principal desde 1,000 casos al mes. Para escalar conviene limitar la duración de las llamadas de voz, mandar a Telegram las consultas de estado, o comparar con n8n autohospedado cuando se pase de 10,000 casos.\n')
L.append('Incertidumbre: los créditos de ElevenLabs incluyen el LLM del agente como pass-through y el panel no separa el costo en USD. El valor por crédito se estima con el precio del plan. El desarrollo con Claude no reporta tokens: se declara como desconocido, no como cero.')
open(os.path.join(D, 'RESUMEN.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')
print('\n'.join(L))
