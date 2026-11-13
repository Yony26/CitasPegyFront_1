/** Interfaz independiente del rol administrador y reportes locales de CitasPegy. */
import { listarEspecialistas, listarServicios } from "./Datos.js";
import { cerrarSesion, obtenerSesion } from "./Autenticacion.js";
import Administracion from "./models/Administracion.js";

const ESTADOS = ["Pendiente", "Confirmada", "Atendida", "No atendida", "Cancelada"];

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[caracter]);
}

function fechaLocal(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function fechaLegible(fecha) {
  if (!fecha) return "Todas las fechas";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric", month: "long", year: "numeric"
  });
}

function formatoPrecio(precio) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0
  }).format(Number(precio) || 0);
}

export async function iniciarAdministracion(negocios) {
  const usuario = obtenerSesion();
  if (usuario?.rol !== "Administrador") {
    throw new Error("Se requiere una cuenta de administrador para abrir este panel.");
  }

  const vista = document.querySelector("#administracion");
  const fechaFiltro = document.querySelector("#reportDate");
  const categoriaFiltro = document.querySelector("#reportCategory");
  const estadoFiltro = document.querySelector("#reportStatus");
  const tarjetas = document.querySelector("#reportCards");
  const desglose = document.querySelector("#reportBreakdown");
  const tablaCitas = document.querySelector("#adminAppointments");
  const catalogo = document.querySelector("#adminCatalog");
  const estadoMensaje = document.querySelector("#adminStatus");

  document.body.classList.add("is-admin");
  vista.hidden = false;
  document.querySelector("#adminWelcome").textContent = `Sesión de ${usuario.nombre} · Reporte del ${fechaLegible(fechaLocal())}`;
  fechaFiltro.value = fechaLocal();
  estadoFiltro.innerHTML = '<option value="">Todos</option>' + ESTADOS.map(estado =>
    `<option value="${escapar(estado)}">${escapar(estado)}</option>`
  ).join("");

  const catalogos = await Promise.all(negocios.map(async negocio => {
    try {
      const [servicios, especialistas] = await Promise.all([
        listarServicios(negocio.id), listarEspecialistas(negocio.id)
      ]);
      return { negocio, servicios, especialistas };
    } catch {
      return {
        negocio,
        servicios: negocio.servicios ?? [],
        especialistas: negocio.especialistas ?? []
      };
    }
  }));

  const citasIniciales = Administracion.listarCitas();
  const categorias = [...new Set([
    ...negocios.map(negocio => negocio.categoria).filter(Boolean),
    ...citasIniciales.map(cita => cita.categoria || "Sin categoría")
  ])].sort((a, b) => a.localeCompare(b, "es"));
  categoriaFiltro.innerHTML = '<option value="">Todas</option>' + categorias.map(categoria =>
    `<option value="${escapar(categoria)}">${escapar(categoria)}</option>`
  ).join("");

  catalogo.innerHTML = catalogos.length ? catalogos.map(({ negocio, servicios, especialistas }) => `
    <article class="admin-business">
      <span class="business-tag">${escapar(negocio.categoria)}</span>
      <h3>${escapar(negocio.nombre)}</h3>
      <p>${escapar(negocio.direccion)} · ★ ${escapar(negocio.calificacion)}</p>
      <p>${servicios.length} servicios · ${especialistas.length} especialistas</p>
      <h4>Servicios</h4>
      <ul>${servicios.map(servicio => `<li>${escapar(servicio.nombre)} — ${formatoPrecio(servicio.precio)} · ${Number(servicio.duracionMinutos)} min</li>`).join("") || "<li>Sin servicios cargados</li>"}</ul>
      <h4>Especialistas</h4>
      <ul>${especialistas.map(especialista => `<li>${escapar(especialista.nombre)} · ${escapar(especialista.cargo)}</li>`).join("") || "<li>Sin especialistas cargados</li>"}</ul>
    </article>`).join("") : '<p class="empty-state">No hay negocios cargados.</p>';

  function renderReporte() {
    const filtros = { fecha: fechaFiltro.value, categoria: categoriaFiltro.value };
    const reporte = Administracion.generarReporte(filtros);
    const citasVisibles = Administracion.listarCitas({ ...filtros, estado: estadoFiltro.value });
    const atendidas = reporte.estados.Atendida ?? 0;
    const noAtendidas = reporte.estados["No atendida"] ?? 0;
    const pendientes = (reporte.estados.Pendiente ?? 0) + (reporte.estados.Confirmada ?? 0);
    const canceladas = reporte.estados.Cancelada ?? 0;

    tarjetas.innerHTML = `
      <article class="report-card"><span>Citas agendadas</span><strong>${reporte.total}</strong><small>${escapar(fechaLegible(fechaFiltro.value))}</small></article>
      <article class="report-card"><span>Atendidas</span><strong>${atendidas}</strong><small>Servicio prestado</small></article>
      <article class="report-card"><span>No atendidas</span><strong>${noAtendidas}</strong><small>Inasistencia registrada</small></article>
      <article class="report-card"><span>Pendientes / confirmadas</span><strong>${pendientes}</strong><small>Por atender</small></article>
      <article class="report-card"><span>Canceladas</span><strong>${canceladas}</strong><small>No cuentan como asistencia</small></article>`;

    desglose.innerHTML = reporte.categorias.length ? `
      <table class="admin-table">
        <thead><tr><th>Categoría</th><th>Total</th>${ESTADOS.map(estado => `<th>${escapar(estado)}</th>`).join("")}</tr></thead>
        <tbody>${reporte.categorias.map(fila => `
          <tr><th>${escapar(fila.categoria)}</th><td>${fila.total}</td>
            ${ESTADOS.map(estado => `<td>${fila.estados[estado] ?? 0}</td>`).join("")}
          </tr>`).join("")}</tbody>
      </table>` : '<p class="empty-state">No hay citas para los filtros seleccionados.</p>';

    tablaCitas.innerHTML = citasVisibles.length ? `
      <table class="admin-table">
        <thead><tr><th>Código</th><th>Cliente</th><th>Negocio / categoría</th><th>Servicio</th><th>Especialista</th><th>Hora</th><th>Estado / asistencia</th></tr></thead>
        <tbody>${citasVisibles.map(cita => `
          <tr>
            <td>${escapar(cita.codigo)}</td><td>${escapar(cita.cliente)}</td>
            <td>${escapar(cita.negocio)}<small class="table-subtitle">${escapar(cita.categoria)}</small></td>
            <td>${escapar(cita.servicio)}</td><td>${escapar(cita.especialista)}</td><td>${escapar(cita.hora)}</td>
            <td><select data-appointment-code="${escapar(cita.codigo)}" aria-label="Estado de ${escapar(cita.codigo)}">
              ${ESTADOS.map(estado => `<option value="${escapar(estado)}"${estado === cita.estado ? " selected" : ""}>${escapar(estado)}</option>`).join("")}
            </select><small class="table-subtitle">Asistencia: ${escapar(cita.asistencia)}</small></td>
          </tr>`).join("")}</tbody>
      </table>` : '<p class="empty-state">No hay citas para los filtros seleccionados.</p>';
  }

  function exportarReporte() {
    const citas = Administracion.listarCitas({
      fecha: fechaFiltro.value,
      categoria: categoriaFiltro.value,
      estado: estadoFiltro.value
    });
    const columnas = ["Código", "Fecha", "Hora", "Categoría", "Negocio", "Cliente", "Servicio", "Especialista", "Estado", "Asistencia"];
    const filas = citas.map(cita => [cita.codigo, cita.fecha, cita.hora, cita.categoria, cita.negocio, cita.cliente, cita.servicio, cita.especialista, cita.estado, cita.asistencia]);
    const csv = [columnas, ...filas].map(fila => fila.map(valor => `"${String(valor ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = `citaspegy-reporte-${fechaFiltro.value || "todas"}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  fechaFiltro.addEventListener("change", renderReporte);
  categoriaFiltro.addEventListener("change", renderReporte);
  estadoFiltro.addEventListener("change", renderReporte);
  document.querySelector("#exportReport").addEventListener("click", exportarReporte);
  tablaCitas.addEventListener("change", event => {
    const control = event.target.closest("select[data-appointment-code]");
    if (!control) return;
    try {
      Administracion.actualizarEstado(control.dataset.appointmentCode, control.value);
      estadoMensaje.textContent = `Cita actualizada: ${control.value}.`;
      estadoMensaje.className = "booking-status is-success";
      renderReporte();
    } catch (error) {
      estadoMensaje.textContent = error.message;
      estadoMensaje.className = "booking-status is-error";
    }
  });
  document.querySelector("#adminLogout").addEventListener("click", () => {
    cerrarSesion();
    location.reload();
  });
  renderReporte();
}
