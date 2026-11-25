/*
 * Núcleo determinista del Cotizador Norte Industrial.
 * Este mismo archivo se incrusta en los nodos Code de n8n (n8n/build.js)
 * y se prueba localmente con `node tests/test_core.js` y en GitHub Actions.
 * No contiene secretos ni llamadas de red.
 */
'use strict';

const CORE_VERSION = '1.0.0';

// ---------- utilidades ----------
const toCents = (x) => Math.round(Number(x) * 100);
const fromCents = (c) => Math.round(c) / 100;
const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

function politicasToObj(rows) {
  // rows: [{clave, valor}] (valor llega como texto desde la Data Table)
  const p = {};
  for (const r of rows || []) {
    const v = r.valor;
    const n = Number(v);
    p[r.clave] = v !== '' && v !== null && !Number.isNaN(n) ? n : v;
  }
  const req = ['iva', 'margen_minimo', 'desc_tramo1_desde', 'desc_tramo1_pct', 'desc_tramo2_desde',
    'desc_tramo2_pct', 'paso_ajuste_desc', 'max_lineas', 'subtotal_maximo', 'vigencia_dias',
    'aprobacion_expira_min', 'max_iteraciones_loop', 'limite_costo_usd_caso', 'max_llamadas_llm_caso',
    'tiempo_max_caso_seg', 'modo'];
  const faltan = req.filter((k) => p[k] === undefined || p[k] === 'PENDIENTE');
  if (faltan.length) throw new Error('Políticas incompletas: ' + faltan.join(', '));
  return p;
}

// ---------- guardrail de entrada (antes de cualquier LLM) ----------
const PATRONES_INYECCION = [
  /ignor(a|e|en|ar)\s+(todas?\s+)?(las\s+)?(instrucciones|reglas|pol[ií]ticas)/i,
  /ignore\s+(all\s+)?(previous|prior|above)/i,
  /(system|developer)\s*prompt/i,
  /\b(api[\s_-]?key|token|contrase[nñ]a|password|secret[oa]?|credencial)/i,
  /(revela|muestra|imprime|dame)\s+(tu|tus|el|la|los|las)\s+(instrucciones|prompt|configuraci[oó]n|claves?)/i,
  /desactiva(r)?\s+(los\s+)?(controles|guardrails|validaci[oó]n|pol[ií]ticas|l[ií]mites)/i,
  /(modo|mode)\s+(desarrollador|developer|dios|god|admin)/i,
  /aprueba(la)?\s+(sin|autom[aá]ticamente)/i,
  /(descuento|precio)\s+(del?\s+)?(9\d|100)\s*%/i,
];
const PATRON_URL = /(https?:\/\/|www\.)\S+/i;
const PATRON_CODIGO = /```|<script|\beval\(|\bexec\(|rm\s+-rf/i;

function guardrailEntrada(texto, opts = {}) {
  const min = opts.min || 10;
  const max = opts.max || 800;
  const t = String(texto || '').trim();
  if (!t) return { ok: false, codigo: 'VACIO', motivo: 'La solicitud está vacía.' };
  if (t.length < min) return { ok: false, codigo: 'INCOMPLETO', motivo: 'La solicitud es demasiado corta para cotizar.' };
  if (t.length > max) return { ok: false, codigo: 'DEMASIADO_LARGO', motivo: `La solicitud excede ${max} caracteres.` };
  if (PATRON_URL.test(t)) return { ok: false, codigo: 'URL_NO_PERMITIDA', motivo: 'No se aceptan enlaces en la solicitud.' };
  if (PATRON_CODIGO.test(t)) return { ok: false, codigo: 'CODIGO_NO_PERMITIDO', motivo: 'No se acepta código en la solicitud.' };
  for (const re of PATRONES_INYECCION) {
    if (re.test(t)) return { ok: false, codigo: 'INYECCION', motivo: 'La solicitud intenta cambiar reglas o pedir información protegida.' };
  }
  return { ok: true, codigo: 'OK', texto: t.replace(/\s+/g, ' ') };
}

// Enmascara datos personales que alguien escriba por error (minimización)
function enmascarar(texto) {
  return String(texto || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[correo]')
    .replace(/(\+?\d[\d\s-]{8,}\d)/g, '[telefono]')
    .replace(/\b[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}\b/gi, '[rfc]');
}

// ---------- parseo de salida LLM ----------
function extraerJSON(texto) {
  if (texto === null || texto === undefined) throw new Error('Respuesta vacía del modelo');
  const s = String(texto);
  const ini = s.indexOf('{');
  const fin = s.lastIndexOf('}');
  if (ini < 0 || fin <= ini) throw new Error('La respuesta del modelo no contiene JSON');
  return JSON.parse(s.slice(ini, fin + 1));
}

// ---------- costos ----------
function costoLlamada(tIn, tOut, pIn, pOut, tCache = 0, pCache = 0) {
  return (Number(tIn) * Number(pIn) + Number(tOut) * Number(pOut) + Number(tCache) * Number(pCache)) / 1e6;
}

// Loop de seguridad y costo: se evalúa ANTES de cada llamada al modelo
function verificarPresupuesto(estado, politicas, estimacion) {
  const est = estimacion || {};
  const tIn = est.tokens_entrada || 2500;
  const tOut = est.max_tokens || 600;
  const reserva = costoLlamada(tIn, tOut, politicas.tarifa_entrada_usd_mtok, politicas.tarifa_salida_usd_mtok);
  const acumulado = Number(estado.costo_acumulado_usd || 0);
  const llamadas = Number(estado.llamadas_llm || 0);
  const transcurrido = (Date.now() - Number(estado.ts_inicio || Date.now())) / 1000;
  if (llamadas + 1 > politicas.max_llamadas_llm_caso) {
    return { ok: false, causa: 'MAX_LLAMADAS', detalle: `Se alcanzó el máximo de ${politicas.max_llamadas_llm_caso} llamadas al modelo.` };
  }
  if (acumulado + reserva > politicas.limite_costo_usd_caso) {
    return { ok: false, causa: 'PRESUPUESTO', detalle: `Costo acumulado ${acumulado.toFixed(6)} USD + reserva ${reserva.toFixed(6)} USD supera el límite ${politicas.limite_costo_usd_caso} USD.` };
  }
  if (transcurrido > politicas.tiempo_max_caso_seg) {
    return { ok: false, causa: 'TIEMPO', detalle: `El caso lleva ${Math.round(transcurrido)} s; el límite es ${politicas.tiempo_max_caso_seg} s.` };
  }
  return { ok: true, reserva_usd: reserva };
}

// ---------- validación de Agente 1 (intake) ----------
function validarIntake(out, politicas) {
  const errores = [];
  if (typeof out !== 'object' || out === null) return { ok: false, errores: ['Salida no es objeto'] };
  if (typeof out.completo !== 'boolean') errores.push('Falta "completo" booleano');
  if (!Array.isArray(out.partidas)) errores.push('Falta arreglo "partidas"');
  if (!Array.isArray(out.faltantes)) errores.push('Falta arreglo "faltantes"');
  const partidas = Array.isArray(out.partidas) ? out.partidas : [];
  if (partidas.length > politicas.max_lineas) errores.push(`Más de ${politicas.max_lineas} partidas`);
  partidas.forEach((p, i) => {
    if (!p || typeof p.descripcion !== 'string' || !p.descripcion.trim()) errores.push(`Partida ${i + 1} sin descripción`);
    if (!Number.isInteger(p.cantidad) || p.cantidad <= 0 || p.cantidad > 100000) errores.push(`Partida ${i + 1} con cantidad inválida`);
  });
  if (out.completo === true) {
    if (!out.cliente || typeof out.cliente !== 'string') errores.push('Caso completo sin cliente');
    if (partidas.length === 0) errores.push('Caso completo sin partidas');
  }
  if (out.completo === false && (!out.aclaracion || typeof out.aclaracion !== 'string')) errores.push('Caso incompleto sin pregunta de aclaración');
  return { ok: errores.length === 0, errores };
}

// ---------- verificación de Agente 2 (catálogo) ----------
function verificarCatalogo(mapeo, partidas, catalogoRows) {
  const porSku = new Map((catalogoRows || []).map((r) => [String(r.sku), r]));
  const lineas = [];
  const advertencias = [];
  const noEncontradas = [];
  if (!mapeo || !Array.isArray(mapeo.coincidencias)) {
    return { ok: false, insuficiente: false, errores: ['Salida sin "coincidencias"'], lineas: [], advertencias };
  }
  partidas.forEach((p, idx) => {
    const m = mapeo.coincidencias.find((c) => Number(c.partida) === idx + 1);
    if (!m || !m.sku) { noEncontradas.push(p.descripcion); return; }
    const item = porSku.get(String(m.sku));
    if (!item) { noEncontradas.push(`${p.descripcion} (SKU propuesto ${m.sku} no existe)`); return; }
    const stock = Number(item.stock);
    if (stock < p.cantidad) advertencias.push(`Stock insuficiente de ${item.sku}: se piden ${p.cantidad}, hay ${stock}. Se cotiza con entrega sujeta a resurtido.`);
    lineas.push({
      partida: idx + 1,
      sku: item.sku,
      producto: item.producto,
      unidad: item.unidad,
      cantidad: p.cantidad,
      precio_lista_mxn: Number(item.precio_lista_mxn),
      costo_mxn: Number(item.costo_mxn),
      desc_max_pct: Number(item.desc_max_pct),
      fuente: `catalogo:${item.sku}`,
    });
  });
  return {
    ok: noEncontradas.length === 0,
    insuficiente: noEncontradas.length > 0,
    no_encontradas: noEncontradas,
    errores: [],
    lineas,
    advertencias,
  };
}

// ---------- Agente 3: calculadora (herramienta determinista del skill cotizar) ----------
function descuentoTabla(cantidad, p) {
  if (cantidad >= p.desc_tramo2_desde) return p.desc_tramo2_pct;
  if (cantidad >= p.desc_tramo1_desde) return p.desc_tramo1_pct;
  return 0;
}

// ajustes: { SKU: descuento_pct } que sustituyen el descuento de tabla (vienen de correcciones del Revisor)
function calcularCotizacion(lineas, politicas, ajustes = {}) {
  let subtotalC = 0;
  const detalle = lineas.map((l) => {
    const tabla = Math.min(descuentoTabla(l.cantidad, politicas), l.desc_max_pct);
    const pct = ajustes[l.sku] !== undefined ? Number(ajustes[l.sku]) : tabla;
    const precioNetoC = Math.round(toCents(l.precio_lista_mxn) * (1 - pct / 100));
    const importeC = precioNetoC * l.cantidad;
    subtotalC += importeC;
    const margen = (precioNetoC - toCents(l.costo_mxn)) / precioNetoC;
    return {
      partida: l.partida,
      sku: l.sku,
      producto: l.producto,
      unidad: l.unidad,
      cantidad: l.cantidad,
      precio_lista_mxn: round2(l.precio_lista_mxn),
      descuento_pct: pct,
      descuento_origen: ajustes[l.sku] !== undefined ? 'ajuste_revisor' : (tabla > 0 ? 'tabla_volumen' : 'sin_descuento'),
      precio_neto_mxn: fromCents(precioNetoC),
      importe_mxn: fromCents(importeC),
      margen_pct: Math.round(margen * 10000) / 100,
      fuente: l.fuente,
    };
  });
  const ivaC = Math.round(subtotalC * politicas.iva);
  return {
    lineas: detalle,
    subtotal_mxn: fromCents(subtotalC),
    iva_mxn: fromCents(ivaC),
    total_mxn: fromCents(subtotalC + ivaC),
    moneda: 'MXN',
    vigencia_dias: politicas.vigencia_dias,
    modo: politicas.modo,
    leyenda: 'RESULTADO SIMULADO · datos ficticios · no es una oferta real',
  };
}

// Aplica las correcciones concretas que devolvió el Revisor (bajar descuento en pasos)
function aplicarCorrecciones(cotizacion, lineasCatalogo, politicas) {
  const porSku = new Map(lineasCatalogo.map((l) => [l.sku, l]));
  const ajustes = {};
  for (const l of cotizacion.lineas) {
    const costoC = toCents(porSku.get(l.sku).costo_mxn);
    const netoActualC = Math.round(toCents(l.precio_lista_mxn) * (1 - l.descuento_pct / 100));
    if ((netoActualC - costoC) / netoActualC >= politicas.margen_minimo) {
      if (l.descuento_origen === 'ajuste_revisor') ajustes[l.sku] = l.descuento_pct;
      continue;
    }
    let pct = l.descuento_pct;
    while (pct > 0) {
      pct = Math.max(0, Math.round((pct - politicas.paso_ajuste_desc) * 100) / 100);
      const netoC = Math.round(toCents(l.precio_lista_mxn) * (1 - pct / 100));
      if ((netoC - costoC) / netoC >= politicas.margen_minimo) break;
    }
    ajustes[l.sku] = pct;
  }
  return ajustes;
}

// ---------- Agente 4: controles deterministas del Revisor ----------
function revisarDeterminista(cot, lineasCatalogo, politicas) {
  const hallazgos = [];
  const porSku = new Map(lineasCatalogo.map((l) => [l.sku, l]));
  let subtotalC = 0;
  for (const l of cot.lineas) {
    const cat = porSku.get(l.sku);
    if (!cat) { hallazgos.push({ tipo: 'FUENTE', sku: l.sku, detalle: 'SKU sin respaldo en catálogo' }); continue; }
    if (round2(cat.precio_lista_mxn) !== l.precio_lista_mxn) hallazgos.push({ tipo: 'PRECIO', sku: l.sku, detalle: 'Precio de lista no coincide con catálogo' });
    if (l.descuento_pct > cat.desc_max_pct) hallazgos.push({ tipo: 'DESCUENTO', sku: l.sku, detalle: `Descuento ${l.descuento_pct}% excede el tope ${cat.desc_max_pct}%` });
    const netoC = Math.round(toCents(cat.precio_lista_mxn) * (1 - l.descuento_pct / 100));
    const margen = (netoC - toCents(cat.costo_mxn)) / netoC;
    if (margen < politicas.margen_minimo) {
      hallazgos.push({
        tipo: 'MARGEN', sku: l.sku,
        detalle: `Margen ${(margen * 100).toFixed(2)}% menor al mínimo ${(politicas.margen_minimo * 100).toFixed(0)}%`,
        correccion: `Reducir el descuento de ${l.sku} en pasos de ${politicas.paso_ajuste_desc} puntos hasta que el margen sea ≥ ${(politicas.margen_minimo * 100).toFixed(0)}%`,
      });
    }
    if (fromCents(netoC * l.cantidad) !== l.importe_mxn) hallazgos.push({ tipo: 'CALCULO', sku: l.sku, detalle: 'Importe de línea no cuadra' });
    subtotalC += netoC * l.cantidad;
  }
  if (fromCents(subtotalC) !== cot.subtotal_mxn) hallazgos.push({ tipo: 'CALCULO', detalle: 'Subtotal no cuadra' });
  const ivaC = Math.round(subtotalC * politicas.iva);
  if (fromCents(subtotalC + ivaC) !== cot.total_mxn) hallazgos.push({ tipo: 'CALCULO', detalle: 'Total no cuadra' });
  if (cot.subtotal_mxn > politicas.subtotal_maximo) hallazgos.push({ tipo: 'POLITICA', detalle: `Subtotal mayor a ${politicas.subtotal_maximo} MXN: requiere gerencia comercial fuera del sistema`, bloqueante: true });
  if (cot.lineas.length > politicas.max_lineas) hallazgos.push({ tipo: 'POLITICA', detalle: 'Demasiadas líneas', bloqueante: true });
  if (!/SIMULADO/.test(cot.leyenda || '')) hallazgos.push({ tipo: 'POLITICA', detalle: 'Falta la leyenda de resultado simulado' });
  const corregibles = hallazgos.filter((h) => h.tipo === 'MARGEN');
  const fueraPolitica = hallazgos.some((h) => h.bloqueante);
  return {
    aprobado: hallazgos.length === 0,
    fuera_de_politica: fueraPolitica,
    corregible: !fueraPolitica && hallazgos.length > 0 && corregibles.length === hallazgos.length,
    hallazgos,
  };
}

// ---------- folio y aprobaciones ----------
function generarFolio(fecha, consecutivo) {
  const d = new Date(fecha);
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `COT-${ymd}-${String(consecutivo).padStart(3, '0')}`;
}
const PATRON_FOLIO = /^COT-\d{8}-\d{3}$/;

function crearNonce() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

// callback_data: D|<folio>|<version>|<nonce>|<A o R>  (≤ 64 bytes)
function parseCallback(data) {
  const m = /^D\|(COT-\d{8}-\d{3})\|(\d)\|([A-Z0-9]{6})\|([AR])$/.exec(String(data || ''));
  if (!m) return null;
  return { caso_id: m[1], version: Number(m[2]), nonce: m[3], decision: m[4] === 'A' ? 'aprobado' : 'rechazado' };
}

function validarDecision(caso, cb, usuario, ahoraISO) {
  if (!usuario || usuario.rol !== 'gerente' || usuario.activo === false) return { ok: false, codigo: 'NO_AUTORIZADO', motivo: 'Solo la gerencia autorizada puede aprobar o rechazar.' };
  if (!caso) return { ok: false, codigo: 'NO_EXISTE', motivo: 'El folio no existe.' };
  if (caso.estado !== 'PENDIENTE_APROBACION') return { ok: false, codigo: 'ESTADO', motivo: `El caso está en estado ${caso.estado}; ya no admite decisión.` };
  if (Number(caso.version_aprobada) !== cb.version) return { ok: false, codigo: 'VERSION', motivo: 'El botón corresponde a otra versión de la propuesta.' };
  if (caso.aprobacion_nonce !== cb.nonce) return { ok: false, codigo: 'NONCE', motivo: 'El botón ya no es válido.' };
  if (new Date(ahoraISO) > new Date(caso.aprobacion_expira)) return { ok: false, codigo: 'EXPIRADO', motivo: 'El tiempo para decidir venció.' };
  return { ok: true };
}

// ---------- exportación sanitizada para el panel público ----------
function exportarPanel(casos, costos, ahoraISO) {
  const terminales = ['APROBADO', 'RECHAZADO', 'EXPIRADO'];
  const filas = (casos || []).map((c) => {
    let total = null;
    let lineas = null;
    try {
      const r = c.resultado_json ? JSON.parse(c.resultado_json) : null;
      if (r && r.total_mxn !== undefined) { total = r.total_mxn; lineas = r.lineas ? r.lineas.length : null; }
    } catch (e) { /* resultado no disponible */ }
    const ini = c.ts_recibido ? new Date(c.ts_recibido) : null;
    const fin = c.ts_propuesta ? new Date(c.ts_propuesta) : null;
    const ciclo = ini && fin ? Math.round((fin - ini) / 1000) : null;
    const costoCaso = (costos || []).filter((k) => k.caso_id === c.caso_id).reduce((a, k) => a + Number(k.costo_usd || 0), 0);
    return {
      caso_id: c.caso_id,
      fecha: /^COT-\d{8}-/.test(c.caso_id || '') ? c.caso_id.slice(4, 8) + '-' + c.caso_id.slice(8, 10) + '-' + c.caso_id.slice(10, 12) : null, // fecha local (CDMX) del folio
      canal: c.canal,
      estado: c.estado,
      version_final: c.version_aprobada || c.version_actual || null,
      iteraciones: c.iteraciones || 0,
      lineas,
      total_mxn: total,
      respuesta_seg: ciclo,
      costo_ia_usd: Math.round(costoCaso * 1e6) / 1e6,
    };
  });
  const conPropuesta = filas.filter((f) => f.total_mxn !== null);
  const decididos = filas.filter((f) => ['APROBADO', 'RECHAZADO'].includes(f.estado));
  const aprobados = filas.filter((f) => f.estado === 'APROBADO');
  const primeraVuelta = conPropuesta.filter((f) => Number(f.version_final) === 1);
  const ciclos = conPropuesta.map((f) => f.respuesta_seg).filter((x) => x !== null);
  const completados = filas.filter((f) => terminales.includes(f.estado));
  const costoCompletados = completados.reduce((a, f) => a + f.costo_ia_usd, 0);
  const mediana = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return {
    meta: {
      empresa: 'Distribuidora Norte Industrial (ficticia)',
      fuente: 'Registro privado de casos en n8n · exportación sanitizada',
      generado: ahoraISO,
      datos_ficticios: true,
      modo: 'SIMULADO',
      version_core: CORE_VERSION,
    },
    kpis: {
      tasa_aprobacion_pct: decididos.length ? Math.round((aprobados.length / decididos.length) * 1000) / 10 : null,
      tasa_aprobacion_den: decididos.length,
      tasa_primera_vuelta_pct: conPropuesta.length ? Math.round((primeraVuelta.length / conPropuesta.length) * 1000) / 10 : null,
      tasa_primera_vuelta_den: conPropuesta.length,
      respuesta_mediana_seg: mediana(ciclos),
      respuesta_den: ciclos.length,
      costo_ia_promedio_usd: completados.length ? Math.round((costoCompletados / completados.length) * 1e6) / 1e6 : null,
      costo_ia_den: completados.length,
    },
    casos: filas.sort((a, b) => String(b.caso_id).localeCompare(String(a.caso_id))),
  };
}

const CORE = {
  CORE_VERSION, toCents, fromCents, round2, politicasToObj, guardrailEntrada, enmascarar, extraerJSON,
  costoLlamada, verificarPresupuesto, validarIntake, verificarCatalogo, descuentoTabla, calcularCotizacion,
  aplicarCorrecciones, revisarDeterminista, generarFolio, PATRON_FOLIO, crearNonce, parseCallback,
  validarDecision, exportarPanel,
};
if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
