// app.js - Interfaz web de CitasPeggy
// Usa las mismas clases, repositorios y servicios que main.js: la pantalla solo dibuja
// y llama a los servicios; las reglas de negocio no se repiten aquí.

import Administracion from '../classes/administracion.js';
import { EstadoCita } from '../enums/estadoCita.js';
import { registrarCliente, iniciarSesion, actualizarPerfil, cambiarContrasena } from '../services/usuarioService.js';
import { solicitarCodigoRecuperacion, restablecerContrasena } from '../services/recuperacionService.js';
import {
  buscarNegocios, listarServicios, detalleServicio, especialistasDelNegocio, crearServicio, actualizarServicio, desactivarServicio
} from '../services/negocioService.js';
import {
    horariosDisponibles, todasLasFranjas, reservarTemporal, confirmarCita, historialCliente,
    agendaDelDia, cancelarCita, reprogramarCita, completarCita, marcarNoAsistio,
    marcarNoAsistidasAutomaticas, metricasNegocio, obtenerComprobante
} from '../services/citaService.js';
import { buscarNegocioPorId, buscarServicioPorId, listarNegocios } from '../repository/negocioRepository.js';
import { buscarPersonaPorId } from '../repository/personaRepository.js';
import { eliminarBloqueo } from '../repository/citaRepository.js';
import { cargarDatosDemo } from './datosDemo.js';

const ICONOS = { Barbería: "💈", Spa: "🧖", Consultorio: "🦷", Restaurante: "🍽️" };
const SEGUNDOS_BLOQUEO = 5 * 60;

// ===== Estado de la pantalla =====
const estado = {
    usuario: null,
    vista: "catalogo",
    filtro: { nombre: "", tipo: "" },
    negocioId: null,
    flujo: null,       // { servicioId, especialistaId, fecha, hora, espAsignado, bloqueo, notas }
    mensaje: null,     // { tipo: "ok" | "error", texto }
    panel: { negocioId: null, especialistaId: null, fecha: null, desde: null, hasta: null },
    reprogramando: null
};
let timerId = null;
let cuentaRegresivaId = null;

// ===== Utilidades =====
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const app = $("#app");

/** Escapa texto antes de ponerlo dentro de HTML (evita que un nombre o nota inyecte código). */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoy = () => iso(new Date());
const sumarDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const dinero = (n) => n === 0 ? "Gratis" : `$${n.toLocaleString("es-CO")}`;
const claseEstado = (e) => ({ [EstadoCita.CONFIRMADA]: "confirmada", [EstadoCita.COMPLETADA]: "atendida", [EstadoCita.NO_ASISTIO]: "no-asistio", [EstadoCita.CANCELADA]: "cancelada", [EstadoCita.PENDIENTE]: "pendiente" }[e]);
const badge = (e) => `<span class="badge badge--${claseEstado(e)}">${esc(e)}</span>`;
const fechaLarga = (f) => new Date(`${f}T12:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
const esAdmin = () => estado.usuario instanceof Administracion;

function avisar(tipo, texto) { estado.mensaje = { tipo, texto }; }
function mensajeHtml() {
    if (!estado.mensaje) return "";
    const { tipo, texto } = estado.mensaje;
    estado.mensaje = null;
    return `<div class="alert alert--${tipo}" role="${tipo === "error" ? "alert" : "status"}">${esc(texto)}</div>`;
}
function ir(vista, extra = {}) {
    if (vista !== "agendar") cancelarFlujo();
    Object.assign(estado, { vista }, extra);
    render();
    window.scrollTo({ top: 0 });
}

// ===== Barra de navegación =====
function renderNav() {
    const enlace = (v, t) => `<button class="nav__link ${estado.vista === v ? "is-active" : ""}" data-action="ir" data-vista="${v}">${t}</button>`;
    let html = enlace("catalogo", "Negocios");
    if (estado.usuario && !esAdmin()) html += enlace("citas", "Mis citas");
    if (esAdmin()) html += enlace("panel", "Panel del negocio");
    if (estado.usuario) {
      html += enlace("perfil", "Mi perfil");
        html += `<span class="nav__user">Hola, ${esc(estado.usuario.nombre)}</span><button class="nav__link" data-action="salir">Cerrar sesión</button>`;
    } else {
        html += `<button class="btn btn--primary btn--small" data-action="abrir-auth">Ingresar</button>`;
    }
    $("#nav").innerHTML = html;
}

// ===== Vista: catálogo (HU01) =====
function viewCatalogo() {
    const tipos = [...new Set(listarNegocios().map(n => n.tipo))];
    return `
    ${mensajeHtml()}
    <section class="hero">
      <h1>Agenda tu cita sin filas ni llamadas</h1>
      <p class="muted">Elige negocio, servicio, especialista y hora en menos de 2 minutos.</p>
      <div class="filters">
        <input id="fNombre" type="search" placeholder="Buscar negocio por nombre…" value="${esc(estado.filtro.nombre)}" aria-label="Buscar negocio por nombre">
        <select id="fTipo" aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          ${tipos.map(t => `<option ${estado.filtro.tipo === t ? "selected" : ""}>${esc(t)}</option>`).join("")}
        </select>
        <button class="btn" data-action="limpiar">Limpiar</button>
      </div>
    </section>
    <div class="chips" id="chips"></div>
    <div id="grid"></div>`;
}
function pintarCatalogo() {
    const tipos = [...new Set(listarNegocios().map(n => n.tipo))];
    $("#chips").innerHTML = tipos.map(t => `<button class="chip ${estado.filtro.tipo === t ? "is-active" : ""}" data-action="chip" data-tipo="${esc(t)}">${esc(t)}s</button>`).join("");
    const lista = buscarNegocios(estado.filtro);
    $("#grid").innerHTML = lista.length === 0
        ? `<div class="empty">No encontramos negocios con esa búsqueda. Prueba con otro nombre o categoría.</div>`
        : `<div class="grid">${lista.map(n => `
          <article class="card">
            <div class="card__img" aria-hidden="true">${ICONOS[n.tipo] ?? "🏪"}</div>
            <h3>${esc(n.nombre)}</h3>
            <div class="card__meta">${esc(n.tipo)} · ${esc(n.direccion)}</div>
            <div class="card__row"><span class="rating">★ 4.8</span>
              <button class="btn btn--primary btn--small" data-action="ver-servicios" data-id="${n.businessId}">Ver servicios</button></div>
          </article>`).join("")}</div>`;
}

// ===== Vista: servicios de un negocio (HU02 y HU03) =====
function viewServicios() {
    const n = buscarNegocioPorId(estado.negocioId);
    const servicios = listarServicios(n.businessId);
    const esps = especialistasDelNegocio(n.businessId);
    return `
    <button class="back" data-action="ir" data-vista="catalogo">← Volver a los negocios</button>
    ${mensajeHtml()}
    <h1>${esc(n.nombre)}</h1>
    <p class="muted">${esc(n.tipo)} · ${esc(n.direccion)} · Tel. ${esc(n.telefono)}</p>
    <h2>Servicios</h2>
    ${servicios.length === 0 ? `<div class="empty">Este negocio todavía no tiene servicios activos.</div>` : `
    <div class="list">${servicios.map(s => `
      <div class="item">
        <div class="item__main">
          <h3>${esc(s.nombre)}</h3>
          <span class="muted">${s.duracionMinutos} min</span> · <span class="item__price">${dinero(s.precio)}</span>
          <details><summary>Ver detalle</summary>
            <p>${esc(s.descripcion)}</p>
            <p>Atienden: ${esps.map(e => esc(e.nombreCompleto)).join(", ") || "—"}</p>
          </details>
        </div>
        <button class="btn btn--primary" data-action="agendar" data-id="${s.serviceId}">Agendar</button>
      </div>`).join("")}</div>`}`;
}

// ===== Flujo de agendamiento (HU04 a HU07) =====
function iniciarFlujo(servicioId) {
    if (!estado.usuario) { estado.pendiente = servicioId; avisar("error", "Inicia sesión para agendar tu cita."); render(); abrirAuth(); return; }
    if (esAdmin()) { avisar("error", "Ingresa como cliente para agendar una cita."); render(); return; }
    estado.flujo = { servicioId, especialistaId: "any", fecha: sumarDias(1), hora: null, espAsignado: null, bloqueo: null, notas: "" };
    ir("agendar");
}
function liberarBloqueo() {
    if (estado.flujo?.bloqueo) eliminarBloqueo(estado.flujo.bloqueo.id);
    if (estado.flujo) { estado.flujo.bloqueo = null; estado.flujo.hora = null; estado.flujo.espAsignado = null; }
    clearInterval(timerId); timerId = null;
}
function cancelarFlujo() { liberarBloqueo(); estado.flujo = null; }

/** Qué especialistas cuentan según la elección del cliente ("any" = todos). */
function candidatos(f) {
    const srv = buscarServicioPorId(f.servicioId);
    const todos = especialistasDelNegocio(srv.negocioId);
    return f.especialistaId === "any" ? todos : todos.filter(e => e.id === Number(f.especialistaId));
}
function horasLibres(f) {
    const libres = new Set();
    candidatos(f).forEach(e => horariosDisponibles(e.id, f.fecha, f.servicioId).forEach(h => libres.add(h)));
    return libres;
}

function viewAgendar() {
    const f = estado.flujo;
    const srv = buscarServicioPorId(f.servicioId);
    const neg = buscarNegocioPorId(srv.negocioId);
    const esps = especialistasDelNegocio(neg.businessId);
    const paso = f.hora ? 4 : 3;
    const pasos = ["1 Servicio", "2 Especialista", "3 Fecha y hora", "4 Confirmar"];
    return `
    <button class="back" data-action="ir" data-vista="servicios" data-id="${neg.businessId}">← Volver a ${esc(neg.nombre)}</button>
    ${mensajeHtml()}
    <ol class="steps">${pasos.map((p, i) => `<li class="${i + 1 < paso ? "is-done" : i + 1 === paso ? "is-active" : ""}">${p}</li>`).join("")}</ol>
    <h1>Agendar: ${esc(srv.nombre)}</h1>
    <p class="muted">${esc(neg.nombre)} · ${srv.duracionMinutos} min · ${dinero(srv.precio)}</p>

    <div class="panel">
      <h3>Especialista</h3>
      <div class="chips" role="radiogroup" aria-label="Especialista">
        <button class="chip ${f.especialistaId === "any" ? "is-active" : ""}" role="radio" aria-checked="${f.especialistaId === "any"}" data-action="esp" data-id="any">Cualquier especialista disponible</button>
        ${esps.map(e => `<button class="chip ${String(f.especialistaId) === String(e.id) ? "is-active" : ""}" role="radio" aria-checked="${String(f.especialistaId) === String(e.id)}" data-action="esp" data-id="${e.id}">${esc(e.nombreCompleto)}</button>`).join("")}
      </div>
    </div>

    <div class="two-cols">
      <div class="panel">
        <h3>Fecha</h3>
        <input type="date" id="fecha" value="${esc(f.fecha)}" min="${hoy()}" aria-label="Fecha de la cita">
        <p class="hint">${esc(fechaLarga(f.fecha))}</p>
      </div>
      <div class="panel">
        <h3>Horarios</h3>
        <div id="slots"></div>
        <p class="hint">Los horarios en gris están ocupados, reservados por otro cliente o ya pasaron.</p>
      </div>
    </div>
    <div id="resumen"></div>`;
}
function pintarSlots() {
    const f = estado.flujo;
    const libres = horasLibres(f);
    const todas = todasLasFranjas(f.servicioId);
    const hayLibres = todas.some(h => libres.has(h));
    $("#slots").innerHTML = (hayLibres ? "" : `<div class="empty">No hay horarios libres este día. Prueba otra fecha u otro especialista.</div>`) +
        `<div class="slots">${todas.map(h => `<button class="slot ${f.hora === h ? "is-selected" : ""}" data-action="hora" data-hora="${h}" ${libres.has(h) ? "" : "disabled"} aria-pressed="${f.hora === h}">${h}</button>`).join("")}</div>`;
}
function pintarResumen() {
    const f = estado.flujo;
    const cont = $("#resumen");
    if (!f.bloqueo) { cont.innerHTML = ""; return; }
    const srv = buscarServicioPorId(f.servicioId);
    const esp = buscarPersonaPorId(f.espAsignado);
    cont.innerHTML = `
    <div class="panel summary">
      <h3>Resumen de tu cita</h3>
      <dl>
        <dt>Servicio</dt><dd>${esc(srv.nombre)}</dd>
        <dt>Especialista</dt><dd>${esc(esp.nombreCompleto)}</dd>
        <dt>Fecha</dt><dd>${esc(fechaLarga(f.fecha))}</dd>
        <dt>Hora</dt><dd>${esc(f.hora)}</dd>
        <dt>Precio</dt><dd>${dinero(srv.precio)}</dd>
      </dl>
      <label class="form"><span class="muted">Notas para el especialista (opcional)</span>
        <textarea id="notas" rows="2" maxlength="200" placeholder="Ej: prefiero el corte más corto">${esc(f.notas)}</textarea></label>
      <p><span class="timer" id="timer" role="timer" aria-live="off">Horario reservado · 05:00</span></p>
      <button class="btn btn--primary btn--block" data-action="confirmar">Confirmar cita</button>
    </div>`;
    iniciarTemporizador();
}
function iniciarTemporizador() {
    clearInterval(timerId);
    const tick = () => {
        const f = estado.flujo;
        if (!f?.bloqueo) { clearInterval(timerId); return; }
        const resta = Math.round((f.bloqueo.expiraEn - new Date()) / 1000);
        const t = $("#timer");
        if (resta <= 0) {
            liberarBloqueo();
            avisar("error", "Pasaron 5 minutos y el horario se liberó. Elige la hora de nuevo.");
            render();
            return;
        }
        if (t) t.textContent = `Horario reservado · ${String(Math.floor(resta / 60)).padStart(2, "0")}:${String(resta % 60).padStart(2, "0")}`;
    };
    tick();
    timerId = setInterval(tick, 1000);
}
function elegirHora(hora) {
    const f = estado.flujo;
    liberarBloqueo();
    try {
        // Con "cualquier especialista" se toma el primero que tenga esa hora libre.
        const esp = candidatos(f).find(e => horariosDisponibles(e.id, f.fecha, f.servicioId).includes(hora));
        if (!esp) throw new Error("Ese horario ya no está disponible");
        f.bloqueo = reservarTemporal(estado.usuario.id, esp.id, f.servicioId, f.fecha, hora);
        f.hora = hora; f.espAsignado = esp.id;
    } catch (e) { avisar("error", e.message); }
    render();
}
function confirmar() {
    const f = estado.flujo;
    f.notas = ($("#notas")?.value ?? "").trim();
    try {
        const cita = confirmarCita(f.bloqueo.id, f.notas);
        f.bloqueo = null; clearInterval(timerId); timerId = null;
        estado.flujo = null;
        estado.vista = "exito"; estado.citaNueva = cita.agendaId;
    } catch (e) { liberarBloqueo(); avisar("error", e.message); }
    render();
}

function viewExito() {
    const c = obtenerComprobante(estado.citaNueva);
    const cita = historialCliente(estado.usuario.id).find(cita => cita.agendaId === estado.citaNueva);
    return `
    <div class="alert alert--ok" role="status">✔ ¡Cita confirmada! Guarda tu código de reserva.</div>
    ${cita ? `<p>Tiempo restante para tu cita: <span class="timer" data-countdown="${cita.inicio.getTime()}" role="timer" aria-live="off"></span></p>` : ""}
    <h1>Tu comprobante</h1>
    <pre class="comprobante">${esc(c)}</pre>
    <div class="actions" style="margin-top:1rem">
      <button class="btn btn--primary" data-action="ir" data-vista="citas">Ver mis citas</button>
      <button class="btn" data-action="ir" data-vista="catalogo">Agendar otra</button>
    </div>`;
}

// ===== Vista: mis citas (HU09, HU12, HU16) =====
function viewCitas() {
    const filtro = estado.filtroCitas ?? "";
    const citas = historialCliente(estado.usuario.id, filtro || null);
    const ahora = new Date();
    return `
    ${mensajeHtml()}
    <h1>Mis citas</h1>
    <div class="toolbar">
      <label>Estado
        <select id="fEstado">
          <option value="">Todas</option>
          ${Object.values(EstadoCita).filter(e => e !== EstadoCita.PENDIENTE).map(e => `<option ${filtro === e ? "selected" : ""}>${esc(e)}</option>`).join("")}
        </select>
      </label>
    </div>
    ${citas.length === 0 ? `<div class="empty">Aún no tienes citas. <button class="btn btn--small" data-action="ir" data-vista="catalogo">Agendar una</button></div>` : `
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Hora</th><th>Tiempo restante</th><th>Negocio / servicio</th><th>Especialista</th><th>Código</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${citas.map(c => {
          const srv = buscarServicioPorId(c.servicioId);
          const neg = buscarNegocioPorId(srv.negocioId);
          const puede = c.puedeCancelarse(ahora);
          const filaRepro = estado.reprogramando === c.agendaId ? `
            <tr><td colspan="8"><div class="toolbar">
              <label>Nueva fecha<input type="date" id="rFecha" min="${hoy()}" value="${esc(estado.reproFecha ?? sumarDias(1))}"></label>
              <label>Nueva hora<select id="rHora">${horariosDisponibles(c.especialistaId, estado.reproFecha ?? sumarDias(1), c.servicioId).map(h => `<option>${h}</option>`).join("") || "<option value=''>Sin horarios</option>"}</select></label>
              <button class="btn btn--primary btn--small" data-action="repro-ok" data-id="${c.agendaId}">Guardar cambio</button>
              <button class="btn btn--small" data-action="repro-no">Cancelar</button>
            </div></td></tr>` : "";
          return `<tr>
            <td>${esc(c.fecha)}</td><td>${esc(c.startTime)}</td>
            <td>${c.estado === EstadoCita.CONFIRMADA ? `<span class="timer" data-countdown="${c.inicio.getTime()}" role="timer" aria-live="off"></span>` : "—"}</td>
            <td><strong>${esc(neg.nombre)}</strong><br><span class="muted">${esc(srv.nombre)}</span></td>
            <td>${esc(buscarPersonaPorId(c.especialistaId).nombreCompleto)}</td>
            <td>${esc(c.bookingCode ?? "—")}</td><td>${badge(c.estado)}</td>
            <td><div class="actions">
              <button class="btn btn--small" data-action="comprobante" data-id="${c.agendaId}">Comprobante</button>
              ${puede ? `<button class="btn btn--small" data-action="repro" data-id="${c.agendaId}">Reprogramar</button>
              <button class="btn btn--small btn--danger" data-action="cancelar" data-id="${c.agendaId}">Cancelar</button>` : ""}
            </div></td></tr>${filaRepro}`;
      }).join("")}</tbody></table></div>
    <p class="hint">Solo puedes cancelar o reprogramar hasta 2 horas antes de la cita.</p>`}`;
}

function iniciarCuentaRegresiva() {
    clearTimeout(cuentaRegresivaId);
    const actualizar = () => {
        const temporizadores = [...document.querySelectorAll("[data-countdown]")];
        temporizadores.forEach(temporizador => {
            const segundos = Math.max(0, Math.floor((Number(temporizador.dataset.countdown) - Date.now()) / 1000));
            if (segundos === 0) {
                temporizador.textContent = "La cita ya comenzó";
                return;
            }
            const dias = Math.floor(segundos / 86400);
            const horas = Math.floor((segundos % 86400) / 3600);
            const minutos = Math.floor((segundos % 3600) / 60);
            const segundosRestantes = segundos % 60;
            const dia = dias ? `${dias} d ` : "";
            temporizador.textContent = `Faltan ${dia}${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundosRestantes).padStart(2, "0")}`;
        });
        if (temporizadores.some(t => Number(t.dataset.countdown) > Date.now())) {
            cuentaRegresivaId = setTimeout(actualizar, 1000);
        } else {
            cuentaRegresivaId = null;
        }
    };
    actualizar();
}

function viewPerfil() {
    const usuario = estado.usuario;
    return `
    ${mensajeHtml()}
    <h1>Mi perfil</h1>
    <p class="muted">Actualiza tus datos de contacto y administra tu contraseña.</p>
    <form id="formPerfil" class="panel form">
      <h2>Datos personales</h2>
      <div class="form__row">
        <label>Nombre<input name="nombre" value="${esc(usuario.nombre)}" autocomplete="given-name" required></label>
        <label>Apellido<input name="apellido" value="${esc(usuario.apellido)}" autocomplete="family-name" required></label>
      </div>
      <div class="form__row">
        <label>Teléfono<input name="telefono" value="${esc(usuario.telefono)}" inputmode="tel" autocomplete="tel" required></label>
        <label>Correo electrónico<input name="correoElectronico" type="email" value="${esc(usuario.correoElectronico)}" autocomplete="email" required></label>
      </div>
      <p class="hint">Tipo de documento: ${esc(usuario.docType)} (no editable).</p>
      <button class="btn btn--primary" type="submit">Guardar datos</button>
    </form>
    <form id="formContrasena" class="panel form">
      <h2>Cambiar contraseña</h2>
      <label>Contraseña actual<input name="actual" type="password" autocomplete="current-password" required></label>
      <div class="form__row">
        <label>Nueva contraseña<input name="nueva" type="password" minlength="6" autocomplete="new-password" required></label>
        <label>Confirmar nueva contraseña<input name="confirmar" type="password" minlength="6" autocomplete="new-password" required></label>
      </div>
      <p class="hint">La contraseña debe tener al menos 6 caracteres.</p>
      <button class="btn btn--primary" type="submit">Cambiar contraseña</button>
    </form>`;
}

// ===== Vista: panel del negocio (HU08, HU11, HU13, HU14) =====
function viewPanel() {
    const p = estado.panel;
    const negocios = listarNegocios();
    p.negocioId ??= negocios[0].businessId;
    const esps = especialistasDelNegocio(p.negocioId);
    if (!esps.some(e => e.id === p.especialistaId)) p.especialistaId = esps[0]?.id ?? null;
    p.fecha ??= hoy(); p.desde ??= sumarDias(-30); p.hasta ??= sumarDias(30);
    const m = metricasNegocio(p.negocioId, p.desde, p.hasta);
    const agenda = p.especialistaId ? agendaDelDia(p.especialistaId, p.fecha) : [];
    const ahora = new Date();
    const servicios = listarServicios(p.negocioId);
    const servicioEditando = servicios.find(s => s.serviceId === estado.editandoServicio);
    return `
    ${mensajeHtml()}
    <h1>Panel del negocio</h1>
    <div class="toolbar">
      <label>Negocio<select id="pNegocio">${negocios.map(n => `<option value="${n.businessId}" ${n.businessId === p.negocioId ? "selected" : ""}>${esc(n.nombre)}</option>`).join("")}</select></label>
    </div>

    <h2>Métricas</h2>
    <div class="toolbar">
      <label>Desde<input type="date" id="pDesde" value="${esc(p.desde)}"></label>
      <label>Hasta<input type="date" id="pHasta" value="${esc(p.hasta)}"></label>
      <button class="btn btn--small" data-action="auto-noshow">Marcar «No asistió» vencidas (24 h)</button>
    </div>
    <div class="tiles">
      <div class="tile tile--main"><div class="tile__label">Inasistencias</div><div class="tile__value">${m.porcentajeInasistencia}%</div></div>
      <div class="tile"><div class="tile__label">Citas totales</div><div class="tile__value">${m.total}</div></div>
      <div class="tile"><div class="tile__label">Atendidas</div><div class="tile__value">${m.atendidas}</div></div>
      <div class="tile"><div class="tile__label">Ingresos por citas atendidas</div><div class="tile__value">${dinero(m.ingresos)}</div></div>
      <div class="tile"><div class="tile__label">No asistió</div><div class="tile__value">${m.noAsistio}</div></div>
      <div class="tile"><div class="tile__label">Canceladas</div><div class="tile__value">${m.canceladas}</div></div>
    </div>
    <div class="toolbar"><button class="btn btn--primary btn--small" data-action="exportar-reporte">Descargar reporte CSV</button></div>
    <h3>Reporte por servicio</h3>
    ${m.porServicio.length === 0 ? `<p class="hint">No hay datos para reportar en el período seleccionado.</p>` : `
    <div class="table-wrap"><table>
      <thead><tr><th>Servicio</th><th>Citas</th><th>Atendidas</th><th>Ingresos</th></tr></thead>
      <tbody>${m.porServicio.map(s => `<tr><td>${esc(s.nombre)}</td><td>${s.citas}</td><td>${s.atendidas}</td><td>${dinero(s.ingresos)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th>Total</th><th>${m.total}</th><th>${m.atendidas}</th><th>${dinero(m.ingresos)}</th></tr></tfoot>
    </table></div>`}
    ${m.total === 0 ? `<p class="hint">No hay citas en ese período.</p>` : ""}

    <h2>Agenda del día</h2>
    <div class="toolbar">
      <label>Especialista<select id="pEsp">${esps.map(e => `<option value="${e.id}" ${e.id === p.especialistaId ? "selected" : ""}>${esc(e.nombreCompleto)}</option>`).join("")}</select></label>
      <label>Fecha<input type="date" id="pFecha" value="${esc(p.fecha)}"></label>
    </div>
    ${agenda.length === 0 ? `<div class="empty">No hay citas para esta fecha.</div>` : `
    <div class="table-wrap"><table>
      <thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Notas</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${agenda.map(c => {
          const puedeCerrar = c.estado === EstadoCita.CONFIRMADA && ahora >= c.inicio;
          return `<tr><td>${esc(c.startTime)}</td><td>${esc(buscarPersonaPorId(c.clienteId).nombreCompleto)}</td>
            <td>${esc(buscarServicioPorId(c.servicioId).nombre)}</td><td>${esc(c.notas || "—")}</td><td>${badge(c.estado)}</td>
            <td><div class="actions">
              <button class="btn btn--small" data-action="atendida" data-id="${c.agendaId}" ${puedeCerrar ? "" : "disabled"}>Atendida</button>
              <button class="btn btn--small btn--danger" data-action="noasistio" data-id="${c.agendaId}" ${puedeCerrar ? "" : "disabled"}>No asistió</button>
            </div></td></tr>`;
      }).join("")}</tbody></table></div>
    <p class="hint">Los botones se activan cuando llega la hora de la cita.</p>`}

    <h2>Servicios del negocio</h2>
    <form id="formServicio" class="panel form">
      <h3>${servicioEditando ? `Editar: ${esc(servicioEditando.nombre)}` : "Agregar un servicio"}</h3>
      <div class="form__row">
        <label>Nombre<input name="nombre" value="${esc(servicioEditando?.nombre ?? "")}" required></label>
        <label>Descripción<input name="descripcion" value="${esc(servicioEditando?.descripcion ?? "")}" required></label>
      </div>
      <div class="form__row">
        <label>Duración (min)<input name="duracion" type="number" min="1" step="1" value="${servicioEditando?.duracionMinutos ?? 30}" required></label>
        <label>Precio (COP)<input name="precio" type="number" min="0" step="1000" value="${servicioEditando?.precio ?? 30000}" required></label>
      </div>
      <div class="actions">
        <button class="btn btn--primary" type="submit">${servicioEditando ? "Guardar cambios" : "Agregar servicio"}</button>
        ${servicioEditando ? `<button class="btn" type="button" data-action="cancelar-edicion">Cancelar edición</button>` : ""}
      </div>
    </form>
    <div class="list">${servicios.map(s => `
      <div class="item"><div class="item__main"><h3>${esc(s.nombre)}</h3><p class="muted">${esc(s.descripcion)}</p><span class="muted">${s.duracionMinutos} min</span> · <span class="item__price">${dinero(s.precio)}</span></div>
      <button class="btn btn--small" data-action="editar-servicio" data-id="${s.serviceId}">Editar</button>
      <button class="btn btn--small btn--danger" data-action="desactivar" data-id="${s.serviceId}">Desactivar</button></div>`).join("")}
    </div>
    <p class="hint">Desactivar un servicio no borra las citas que ya se agendaron con él.</p>`;
}

// ===== Render principal =====
function render() {
    renderNav();
    $("#nav").classList.remove("is-open");
    const vistas = { catalogo: viewCatalogo, servicios: viewServicios, agendar: viewAgendar, exito: viewExito, citas: viewCitas, panel: viewPanel, perfil: viewPerfil };
    // Rutas protegidas
    if ((["citas", "perfil"].includes(estado.vista) && !estado.usuario) || (estado.vista === "panel" && !esAdmin())) estado.vista = "catalogo";
    if (estado.vista === "agendar" && !estado.flujo) estado.vista = "catalogo";
    app.innerHTML = vistas[estado.vista]();
    if (estado.vista === "catalogo") pintarCatalogo();
    if (estado.vista === "agendar") { pintarSlots(); pintarResumen(); }
    iniciarCuentaRegresiva();
}

// ===== Autenticación (HU01 y HU02 de la plataforma) =====
const dlgAuth = $("#dlgAuth");
const dlgRecuperacion = $("#dlgRecuperacion");
dlgRecuperacion.addEventListener("close", () => {
  $("#formSolicitarCodigo").reset();
  $("#formSolicitarCodigo").hidden = false;
  $("#formRestablecerContrasena").reset();
  $("#formRestablecerContrasena").hidden = true;
  $("#labelDestinoRecuperacion").firstChild.textContent = "Correo electrónico";
  $("#destinoRecuperacion").type = "email";
  $("#destinoRecuperacion").autocomplete = "email";
  $("#destinoRecuperacion").placeholder = "nombre@correo.com";
  $("#destinoRecuperacion").inputMode = "email";
  $("#errSolicitarCodigo").textContent = "";
  $("#errRestablecerContrasena").textContent = "";
  estado.recuperacion = null;
});
function abrirAuth() { $("#errLogin").textContent = ""; $("#errRegistro").textContent = ""; if (!dlgAuth.open) dlgAuth.showModal(); }
function cambiarTab(tab) {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("is-active", b.dataset.tab === tab));
    $("#formLogin").hidden = tab !== "login";
    $("#formRegistro").hidden = tab !== "registro";
}
$("#formLogin").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = new FormData(ev.target);
    try {
        estado.usuario = iniciarSesion(String(d.get("correo")).trim(), String(d.get("contrasena")));
        dlgAuth.close(); ev.target.reset();
        avisar("ok", `Bienvenida/o, ${estado.usuario.nombre}.`);
        if (!esAdmin() && estado.pendiente) { const sid = estado.pendiente; estado.pendiente = null; iniciarFlujo(sid); }
        else ir(esAdmin() ? "panel" : "catalogo");
    } catch (e) { $("#errLogin").textContent = e.message; }
});
$("#formRegistro").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = new FormData(ev.target);
    try {
        registrarCliente(d.get("docType"), String(d.get("nombre")).trim(), String(d.get("apellido")).trim(),
            String(d.get("telefono")).trim(), String(d.get("correo")).trim(), String(d.get("contrasena")), String(d.get("confirmar")));
        estado.usuario = iniciarSesion(String(d.get("correo")).trim(), String(d.get("contrasena")));
        dlgAuth.close(); ev.target.reset();
        avisar("ok", "Cuenta creada. ¡Ya puedes agendar!");
        ir("catalogo");
    } catch (e) { $("#errRegistro").textContent = e.message; }
});

// ===== Eventos (delegación) =====
document.addEventListener("click", (ev) => {
    const tab = ev.target.closest(".tab");
    if (tab) return cambiarTab(tab.dataset.tab);
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    const id = Number(el.dataset.id);
    const accion = {
        "ir": () => ir(el.dataset.vista, el.dataset.id ? { negocioId: id } : {}),
        "menu": () => $("#nav").classList.toggle("is-open"),
        "abrir-auth": abrirAuth,
        "abrir-recuperacion": () => {
          dlgAuth.close();
          $("#errSolicitarCodigo").textContent = "";
          if (!dlgRecuperacion.open) dlgRecuperacion.showModal();
        },
        "salir": () => { cancelarFlujo(); estado.usuario = null; avisar("ok", "Sesión cerrada."); ir("catalogo"); },
        "limpiar": () => { estado.filtro = { nombre: "", tipo: "" }; render(); },
        "chip": () => { estado.filtro.tipo = estado.filtro.tipo === el.dataset.tipo ? "" : el.dataset.tipo; render(); },
        "ver-servicios": () => ir("servicios", { negocioId: id }),
        "agendar": () => iniciarFlujo(id),
        "esp": () => { liberarBloqueo(); estado.flujo.especialistaId = el.dataset.id; render(); },
        "hora": () => elegirHora(el.dataset.hora),
        "confirmar": confirmar,
        "comprobante": () => { $("#comprobanteTexto").textContent = obtenerComprobante(id); $("#dlgComprobante").showModal(); },
        "cancelar": () => {
            if (!confirm("¿Seguro que quieres cancelar esta cita?")) return;
            try { cancelarCita(id); avisar("ok", "Cita cancelada. El horario quedó libre."); } catch (e) { avisar("error", e.message); }
            render();
        },
        "repro": () => { estado.reprogramando = id; estado.reproFecha = sumarDias(1); render(); },
        "repro-no": () => { estado.reprogramando = null; render(); },
        "repro-ok": () => {
            try {
                reprogramarCita(id, $("#rFecha").value, $("#rHora").value);
                avisar("ok", "Cita reprogramada. Conservas tu código de reserva.");
                estado.reprogramando = null;
            } catch (e) { avisar("error", e.message); }
            render();
        },
        "atendida": () => cerrarCita(() => completarCita(id), "Cita marcada como atendida."),
        "noasistio": () => cerrarCita(() => marcarNoAsistio(id), "Cita marcada como «No asistió»."),
        "auto-noshow": () => { const n = marcarNoAsistidasAutomaticas(); avisar("ok", `${n} cita(s) marcadas como «No asistió».`); render(); },
        "exportar-reporte": exportarReporteCsv,
        "editar-servicio": () => { if (!esAdmin()) return; estado.editandoServicio = id; render(); },
        "cancelar-edicion": () => { estado.editandoServicio = null; render(); },
        "desactivar": () => {
          if (!esAdmin()) return;
          desactivarServicio(id); estado.editandoServicio = null;
          avisar("ok", "Servicio desactivado. El historial se conserva."); render();
        }
    }[el.dataset.action];
    accion?.();
});
function cerrarCita(fn, ok) { try { fn(); avisar("ok", ok); } catch (e) { avisar("error", e.message); } render(); }

function exportarReporteCsv() {
  if (!esAdmin()) { avisar("error", "Solo el administrador puede descargar reportes."); render(); return; }
  try {
    const p = estado.panel;
    const m = metricasNegocio(p.negocioId, p.desde, p.hasta);
    const filas = [
      ["Reporte de citas e ingresos", ""], ["Desde", p.desde], ["Hasta", p.hasta],
      ["Citas totales", m.total], ["Confirmadas", m.confirmadas], ["Atendidas", m.atendidas],
      ["Canceladas", m.canceladas], ["No asistió", m.noAsistio], ["Ingresos por citas atendidas (COP)", m.ingresos],
      [], ["Servicio", "Citas", "Atendidas", "Ingresos (COP)"],
      ...m.porServicio.map(s => [s.nombre, s.citas, s.atendidas, s.ingresos])
    ];
    const csv = filas.map(fila => fila.map(valor => `"${String(valor ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte-citas-${p.desde}-${p.hasta}.csv`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { avisar("error", e.message); render(); }
}

document.addEventListener("input", (ev) => {
    if (ev.target.id === "fNombre") { estado.filtro.nombre = ev.target.value; pintarCatalogo(); }
});
document.addEventListener("change", (ev) => {
    const t = ev.target, p = estado.panel;
  if (t.id === "canalRecuperacion") {
    const porEmail = t.value === "email";
    $("#labelDestinoRecuperacion").firstChild.textContent = porEmail ? "Correo electrónico" : "Número de celular";
    const destino = $("#destinoRecuperacion");
    destino.type = porEmail ? "email" : "tel";
    destino.autocomplete = porEmail ? "email" : "tel";
    destino.placeholder = porEmail ? "nombre@correo.com" : "3001234567";
    destino.inputMode = porEmail ? "email" : "tel";
    return;
  }
    const mapa = {
        fTipo: () => { estado.filtro.tipo = t.value; render(); },
        fecha: () => { liberarBloqueo(); estado.flujo.fecha = t.value || sumarDias(1); render(); },
        fEstado: () => { estado.filtroCitas = t.value; render(); },
        rFecha: () => { estado.reproFecha = t.value; render(); },
        pNegocio: () => { p.negocioId = Number(t.value); p.especialistaId = null; render(); },
        pEsp: () => { p.especialistaId = Number(t.value); render(); },
        pFecha: () => { p.fecha = t.value; render(); },
        pDesde: () => { p.desde = t.value; render(); },
        pHasta: () => { p.hasta = t.value; render(); }
    };
    mapa[t.id]?.();
});
document.addEventListener("submit", (ev) => {
  if (ev.target.id === "formSolicitarCodigo") {
    ev.preventDefault();
    const datos = new FormData(ev.target);
    const canal = String(datos.get("canal"));
    const destino = String(datos.get("destino")).trim();
    const boton = ev.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    $("#errSolicitarCodigo").textContent = "";
    solicitarCodigoRecuperacion(canal, destino)
      .then(() => {
        estado.recuperacion = { canal, destino };
        ev.target.hidden = true;
        $("#mensajeCodigoEnviado").textContent = "Si existe una cuenta con esos datos, recibirás un código de recuperación. Revisa tu correo o tus mensajes.";
        $("#formRestablecerContrasena").hidden = false;
      })
      .catch(error => { $("#errSolicitarCodigo").textContent = error.message; })
      .finally(() => { boton.disabled = false; });
    return;
  }
  if (ev.target.id === "formRestablecerContrasena") {
    ev.preventDefault();
    const datos = new FormData(ev.target);
    const nueva = String(datos.get("nuevaContrasena"));
    const confirmar = String(datos.get("confirmarContrasena"));
    if (nueva !== confirmar) {
      $("#errRestablecerContrasena").textContent = "La nueva contraseña y su confirmación no coinciden.";
      return;
    }
    const boton = ev.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    $("#errRestablecerContrasena").textContent = "";
    restablecerContrasena(estado.recuperacion.canal, estado.recuperacion.destino, String(datos.get("codigo")).trim(), nueva)
      .then(() => {
        dlgRecuperacion.close();
        ev.target.reset();
        $("#formSolicitarCodigo").reset();
        $("#formSolicitarCodigo").hidden = false;
        ev.target.hidden = true;
        estado.recuperacion = null;
        avisar("ok", "Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.");
        render();
        abrirAuth();
      })
      .catch(error => { $("#errRestablecerContrasena").textContent = error.message; })
      .finally(() => { boton.disabled = false; });
    return;
  }
  if (ev.target.id === "formPerfil") {
    ev.preventDefault();
    const d = new FormData(ev.target);
    try {
      actualizarPerfil(estado.usuario.id, {
        nombre: d.get("nombre"), apellido: d.get("apellido"), telefono: d.get("telefono"),
        correoElectronico: d.get("correoElectronico")
      });
      avisar("ok", "Tus datos se actualizaron correctamente.");
    } catch (e) { avisar("error", e.message); }
    render();
    return;
  }
  if (ev.target.id === "formContrasena") {
    ev.preventDefault();
    const d = new FormData(ev.target);
    try {
      cambiarContrasena(estado.usuario.id, String(d.get("actual")), String(d.get("nueva")), String(d.get("confirmar")));
      avisar("ok", "Tu contraseña se cambió correctamente.");
    } catch (e) { avisar("error", e.message); }
    render();
    return;
  }
    if (ev.target.id !== "formServicio") return;
    ev.preventDefault();
    const d = new FormData(ev.target);
    try {
      if (!esAdmin()) throw new Error("Solo el administrador puede administrar servicios");
      const datos = {
        nombre: String(d.get("nombre")).trim(), descripcion: String(d.get("descripcion")).trim(),
        duracionMinutos: Number(d.get("duracion")), precio: Number(d.get("precio"))
      };
      if (estado.editandoServicio) {
        actualizarServicio(estado.editandoServicio, datos);
        estado.editandoServicio = null;
        avisar("ok", "Servicio actualizado. El precio guardado en citas anteriores no cambia.");
      } else {
        crearServicio(estado.panel.negocioId, datos.nombre, datos.descripcion, datos.duracionMinutos, datos.precio);
        avisar("ok", "Servicio agregado al catálogo.");
      }
    } catch (e) { avisar("error", e.message); }
    render();
});

// ===== Inicio =====
cargarDatosDemo();
render();
