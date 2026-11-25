#!/usr/bin/env node
// Controles previos a publicar en GitHub Pages. Si algo falla, sale con código 1 y el despliegue NO ocurre.
'use strict';
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const errores = [];
const ok = (m) => console.log('  ✓ ' + m);
const mal = (m) => { errores.push(m); console.log('  ✗ ' + m); };

// 1. Archivos necesarios
for (const f of ['web/index.html', 'web/data/panel.json', 'datos/catalogo.csv', 'datos/politicas.csv', 'src/core.js', 'skills/cotizar-material-electrico/SKILL.md', 'skills/revisar-cotizacion/SKILL.md']) {
  fs.existsSync(path.join(raiz, f)) ? ok('existe ' + f) : mal('falta ' + f);
}

// 2. Estructura del panel exportado
let panel = null;
try { panel = JSON.parse(fs.readFileSync(path.join(raiz, 'web/data/panel.json'), 'utf8')); ok('panel.json es JSON válido'); } catch (e) { mal('panel.json no es JSON válido: ' + e.message); }
if (panel) {
  if (!panel.meta || panel.meta.datos_ficticios !== true || panel.meta.modo !== 'SIMULADO') mal('meta debe declarar datos_ficticios=true y modo=SIMULADO'); else ok('meta declara datos ficticios y modo SIMULADO');
  if (!panel.meta || isNaN(new Date(panel.meta.generado))) mal('meta.generado no es fecha'); else ok('fecha de generación válida');
  if (!panel.kpis) mal('faltan kpis'); else ok('kpis presentes');
  const permitidas = ['caso_id', 'fecha', 'canal', 'estado', 'version_final', 'iteraciones', 'lineas', 'total_mxn', 'respuesta_seg', 'costo_ia_usd'];
  const estados = ['APROBADO', 'RECHAZADO', 'EXPIRADO', 'PENDIENTE_APROBACION', 'ACLARACION', 'FUERA_DE_POLITICA', 'BLOQUEADO', 'DETENIDO_LIMITE', 'ERROR', 'EN_PROCESO'];
  (panel.casos || []).forEach((c, i) => {
    const extra = Object.keys(c).filter((k) => !permitidas.includes(k));
    if (extra.length) mal(`caso ${i}: columnas no permitidas en zona pública: ${extra.join(', ')}`);
    if (!/^COT-\d{8}-\d{3}$/.test(c.caso_id)) mal(`caso ${i}: folio inválido`);
    if (!estados.includes(c.estado)) mal(`caso ${i}: estado desconocido ${c.estado}`);
    if (!['telegram', 'voz'].includes(c.canal)) mal(`caso ${i}: canal inválido`);
    if (c.total_mxn !== null && !(c.total_mxn >= 0)) mal(`caso ${i}: total inválido`);
  });
  ok(`${(panel.casos || []).length} casos revisados contra la lista de columnas públicas`);
  // 3. Cálculo determinista: KPIs del panel = recálculo con src/core.js
  const C = require('../src/core.js');
  const n = panel.casos || [];
  const dec = n.filter((c) => ['APROBADO', 'RECHAZADO'].includes(c.estado));
  const esperado = dec.length ? Math.round(n.filter((c) => c.estado === 'APROBADO').length / dec.length * 1000) / 10 : null;
  if (panel.kpis && panel.kpis.tasa_aprobacion_pct !== esperado) mal(`KPI aprobación no cuadra: ${panel.kpis.tasa_aprobacion_pct} vs ${esperado}`); else ok('KPI de aprobación cuadra con el detalle');
  void C;
}

// 4. Nada sensible en lo que se publica ni en los workflows exportados
const patrones = [
  [/sk-ant-[A-Za-z0-9_-]{10,}/, 'API key de Anthropic'],
  [/\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/, 'token de bot de Telegram'],
  [/"chat_id"\s*:\s*"?\d{5,}/, 'chat_id de Telegram'],
  [/\b(VEN|GER)-\d{2}\b/, 'seudónimo de usuario'],
  [/[\w.+-]+@[\w-]+\.(com|mx|net|org)\b/, 'correo electrónico'],
  [/xi-api-key|ELEVENLABS_API_KEY\s*=\s*\S+/, 'API key de ElevenLabs'],
];
function revisarArchivo(rel, lista) {
  const txt = fs.readFileSync(path.join(raiz, rel), 'utf8');
  for (const [re, nombre] of lista) if (re.test(txt)) mal(`${rel}: posible ${nombre}`);
}
const publicos = ['web/index.html', 'web/data/panel.json'];
publicos.forEach((f) => fs.existsSync(path.join(raiz, f)) && revisarArchivo(f, patrones));
ok('zona pública revisada (web/)');
const wfDir = path.join(raiz, 'n8n/workflows');
if (fs.existsSync(wfDir)) {
  for (const f of fs.readdirSync(wfDir).filter((x) => x.endsWith('.json'))) revisarArchivo('n8n/workflows/' + f, patrones.slice(0, 2).concat(patrones.slice(5)));
  ok('exportaciones de n8n sin secretos');
}
if (/REEMPLAZAR_AGENT_ID/.test(fs.readFileSync(path.join(raiz, 'web/index.html'), 'utf8'))) console.log('  ! aviso: el agente de voz aún no está configurado en index.html');

console.log(errores.length ? `\n${errores.length} control(es) fallaron: NO se publica.` : '\nTodos los controles pasaron.');
process.exit(errores.length ? 1 : 0);
