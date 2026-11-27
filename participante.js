// Número de participante de la prueba remota (T115), compartido por la portada, las tareas y la encuesta. El servidor
// lo asigna al aceptar el consentimiento y el teléfono lo recuerda; si el navegador no deja guardarlo (modo privado),
// la página lo muestra para anotarlo.
const API = 'https://nutriz-api-6635.azurewebsites.net';
const CLAVE_PARTICIPANTE = 'nutriz.participante';
const CLAVE_TAREA = 'nutriz.tarea';

// Despierta el servidor de pruebas y su base (la base se pausa tras una hora sin uso y tarda en volver; T116).
fetch(`${API}/salud/bd`, { mode: 'no-cors' }).catch(() => {});

function participanteGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PARTICIPANTE) ?? 'null'); } catch { return null; }
}

function guardarParticipante(p) {
  try { localStorage.setItem(CLAVE_PARTICIPANTE, JSON.stringify(p)); } catch {}
}

function olvidarParticipante() {
  try { localStorage.removeItem(CLAVE_PARTICIPANTE); localStorage.removeItem(CLAVE_TAREA); } catch {}
}

/** Petición con hasta 90 s de espera: si el servidor estaba dormido, la primera respuesta tarda. */
async function pedirJson(ruta, opciones = {}) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), 90000);
  try {
    const r = await fetch(`${API}${ruta}`, { ...opciones, signal: control.signal });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(datos.message ?? `El servidor respondió ${r.status}`), { status: r.status });
    return datos;
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * POST que reintenta si falla la red o el servidor (500 o más), por ejemplo porque la base estaba pausada (T119):
 * antes de cada reintento espera a que `/salud/bd` confirme que la base volvió. Los 4xx no se reintentan.
 */
async function enviarJson(ruta, cuerpo, alReintentar) {
  for (let intento = 1; ; intento++) {
    try {
      return await pedirJson(ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    } catch (err) {
      if ((err.status && err.status < 500) || intento === 3) throw err;
      alReintentar?.();
      await pedirJson('/salud/bd').catch(() => new Promise((listo) => setTimeout(listo, 5000)));
    }
  }
}
