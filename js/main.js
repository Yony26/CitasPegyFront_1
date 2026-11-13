// Controlador de la interfaz: conecta eventos del DOM con modelos y Datos.js.
// Las vistas futuras del administrador y de gestión de citas pueden añadirse
// aquí o en módulos separados sin mezclar su lógica con el consumo de la API.
import {
  confirmarRetencion,
  crearRetencion,
  liberarRetencion,
  listarEspecialistas,
  listarHorariosDisponibles,
  listarNegocios,
  listarServicios
} from "./Datos.js";
import Cliente from "./models/Cliente.js";

const state = {
  businesses: [],
  business: null,
  services: [],
  specialists: [],
  service: null,
  hold: null,
  availabilityRequest: 0,
  holdRequest: 0,
  timerId: null
};

const dom = {
  categoryList: document.querySelector("#categoryList"),
  search: document.querySelector("#businessSearch"),
  categoryFilter: document.querySelector("#categoryFilter"),
  businesses: document.querySelector("#businessList"),
  businessCategory: document.querySelector("#selectedBusinessCategory"),
  services: document.querySelector("#serviceList"),
  serviceCount: document.querySelector("#serviceCount"),
  bookingSection: document.querySelector("#agendar"),
  selectedService: document.querySelector("#selectedService"),
  bookingForm: document.querySelector("#bookingForm"),
  specialist: document.querySelector("#specialistSelect"),
  date: document.querySelector("#appointmentDate"),
  time: document.querySelector("#timeSelect"),
  notes: document.querySelector("#appointmentNotes"),
  customerName: document.querySelector("#customerName"),
  status: document.querySelector("#bookingStatus"),
  timer: document.querySelector("#holdTimer"),
  confirm: document.querySelector("#confirmBooking"),
  close: document.querySelector("#closeBooking"),
  receipt: document.querySelector("#receiptDialog"),
  receiptCode: document.querySelector("#receiptCode"),
  receiptCustomer: document.querySelector("#receiptCustomer"),
  receiptService: document.querySelector("#receiptService"),
  receiptSpecialist: document.querySelector("#receiptSpecialist"),
  receiptDate: document.querySelector("#receiptDate"),
  receiptTime: document.querySelector("#receiptTime")
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPrice(price) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(price);
}

function formatDuration(minutes) {
  return `${String(minutes).padStart(2, "0")}:00 min`;
}

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatAppointmentDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function showStatus(message, type = "info") {
  dom.status.textContent = message;
  dom.status.className = `booking-status is-${type}`;
}

function clearStatus() {
  dom.status.textContent = "";
  dom.status.className = "booking-status";
}

// El buscador y la categoría actual se aplican juntos usando el modelo Negocio.
function renderBusinesses() {
  const term = dom.search.value.trim();
  const category = dom.categoryFilter.value;
  const matches = state.businesses.filter(business =>
    business.coincideConFiltro(term, category)
  );

  if (!matches.length) {
    dom.businesses.innerHTML = '<p class="empty-state">No encontramos negocios con esos filtros. Intenta con otra búsqueda.</p>';
    return;
  }

  dom.businesses.innerHTML = matches.map(business => `
    <article class="business-card">
      <div class="business-icon" aria-hidden="true">💈</div>
      <div class="business-info">
        <span class="business-tag">${escapeHtml(business.categoria)}</span>
        <h3>${escapeHtml(business.nombre)}</h3>
        <p>${escapeHtml(business.direccion)}</p>
      </div>
      <span class="business-rating"><span aria-hidden="true">★</span> ${escapeHtml(business.calificacion)}</span>
      <button class="button button-primary" type="button" data-business-id="${escapeHtml(business.id)}">Ver servicios</button>
    </article>
  `).join("");
}

function renderServices() {
  if (!state.business) {
    dom.services.innerHTML = '<p class="empty-state">Selecciona un negocio para consultar su catálogo.</p>';
    dom.serviceCount.textContent = "";
    return;
  }

  dom.businessCategory.textContent = state.business.nombre.toLocaleUpperCase("es");
  dom.serviceCount.textContent = `${state.services.length} servicios disponibles`;
  dom.services.innerHTML = state.services.length
    ? state.services.map(service => {
      const image = globalThis.CITASPEGY_SERVICE_IMAGES?.[service.nombre] ?? "";
      return `
      <article class="service-card">
        ${image
          ? `<img class="service-image" src="${escapeHtml(image)}" alt="${escapeHtml(service.nombre)}" loading="lazy">`
          : `<span class="service-symbol" aria-hidden="true">${escapeHtml(service.icono)}</span>`}
        <h3>${escapeHtml(service.nombre)}</h3>
        <p class="service-description">${escapeHtml(service.descripcion)}</p>
        <div class="service-bottom">
          <span class="service-price">${formatPrice(service.precio)}
            <span class="service-duration">${formatDuration(service.duracionMinutos)}</span>
          </span>
          <button class="button button-primary service-book" type="button" data-service-id="${escapeHtml(service.id)}">Agendar</button>
        </div>
      </article>`;
    }).join("")
    : '<p class="empty-state">Este negocio todavía no tiene servicios activos.</p>';
}

async function selectBusiness(business) {
  state.business = business;
  dom.businesses.setAttribute("aria-busy", "true");
  dom.businesses.querySelectorAll("button").forEach(button => { button.disabled = true; });
  let catalogError = "";
  try {
    // Los catálogos se consultan por separado para mantener cada módulo pequeño
    // y permitir que Java exponga controladores REST independientes.
    const [services, specialists] = await Promise.all([
      listarServicios(business.id),
      listarEspecialistas(business.id)
    ]);
    state.services = services;
    state.specialists = specialists;
    renderServices();
    document.querySelector("#servicios").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    state.services = [];
    renderServices();
    catalogError = error.message;
  } finally {
    dom.businesses.removeAttribute("aria-busy");
    renderBusinesses();
  }
  if (catalogError) {
    dom.businesses.insertAdjacentHTML("beforeend", `<p class="empty-state" role="alert">${escapeHtml(catalogError)}</p>`);
  }
}

async function releaseCurrentHold() {
  const hold = state.hold;
  state.hold = null;
  clearInterval(state.timerId);
  state.timerId = null;
  dom.timer.hidden = true;
  if (!hold) return;

  try {
    await liberarRetencion(hold);
  } catch (error) {
    showStatus(`${error.message} El bloqueo del servidor debe expirar automáticamente.`, "error");
  }
}

async function loadAvailableTimes() {
  const request = ++state.availabilityRequest;
  state.holdRequest += 1;
  await releaseCurrentHold();
  if (request !== state.availabilityRequest) return;

  const service = state.service;
  const specialistId = Number(dom.specialist.value);
  const date = dom.date.value;
  dom.time.disabled = true;
  dom.time.innerHTML = '<option value="">Consultando horarios...</option>';
  if (!service || !specialistId || !date) {
    dom.time.innerHTML = '<option value="">Selecciona fecha y especialista</option>';
    dom.time.disabled = false;
    return;
  }

  try {
    const hours = await listarHorariosDisponibles({
      servicioId: service.id,
      especialistaId: specialistId,
      fecha: date,
      duracionMinutos: service.duracionMinutos
    });
    if (request !== state.availabilityRequest) return;
    dom.time.innerHTML = '<option value="">Elige una hora</option>' +
      hours.map(hour => `<option value="${escapeHtml(hour)}">${escapeHtml(hour)}</option>`).join("");
    if (!hours.length) {
      dom.time.innerHTML = '<option value="">No hay horarios disponibles</option>';
    }
  } catch (error) {
    if (request === state.availabilityRequest) {
      dom.time.innerHTML = '<option value="">No se pudieron cargar los horarios</option>';
      showStatus(error.message, "error");
    }
  } finally {
    if (request === state.availabilityRequest) dom.time.disabled = false;
  }
}

function renderSpecialists() {
  if (!state.specialists.length) {
    dom.specialist.innerHTML = '<option value="">No hay especialistas activos</option>';
    dom.specialist.disabled = true;
    return;
  }
  dom.specialist.disabled = false;
  dom.specialist.innerHTML = state.specialists.map(specialist =>
    `<option value="${escapeHtml(specialist.id)}">${escapeHtml(specialist.nombre)} · ${escapeHtml(specialist.cargo)}</option>`
  ).join("");
}

async function openBooking(serviceId) {
  const service = state.services.find(item => item.id === Number(serviceId));
  if (!service) return;

  state.service = service;
  state.holdRequest += 1;
  await releaseCurrentHold();
  dom.selectedService.innerHTML = `
    <h3>${escapeHtml(service.nombre)}</h3>
    <p>${escapeHtml(service.descripcion)} · ${formatDuration(service.duracionMinutos)} · ${formatPrice(service.precio)}</p>`;
  renderSpecialists();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dom.date.min = localDate();
  dom.date.value = localDate(tomorrow);
  dom.time.value = "";
  dom.notes.value = "";
  dom.customerName.value = "";
  dom.confirm.disabled = false;
  dom.confirm.textContent = "Confirmar reserva";
  clearStatus();
  dom.bookingSection.hidden = false;
  dom.bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });

  if (state.specialists.length) await loadAvailableTimes();
}

async function createHold() {
  const service = state.service;
  const time = dom.time.value;
  const specialistId = Number(dom.specialist.value);
  if (!service || !time || !specialistId || !dom.date.value) return;

  const request = ++state.holdRequest;
  await releaseCurrentHold();
  if (request !== state.holdRequest) return;

  dom.confirm.disabled = true;
  showStatus("Reteniendo el horario seleccionado por cinco minutos...", "info");
  try {
    const hold = await crearRetencion({
      servicioId: service.id,
      especialistaId: specialistId,
      fecha: dom.date.value,
      hora: time,
      duracionMinutos: service.duracionMinutos,
      notas: dom.notes.value.trim()
    });
    if (request !== state.holdRequest) {
      await liberarRetencion(hold);
      return;
    }
    state.hold = hold;
    clearStatus();
    startHoldTimer();
  } catch (error) {
    if (request === state.holdRequest) {
      showStatus(error.message, "error");
      dom.confirm.disabled = false;
      loadAvailableTimes();
    }
  } finally {
    if (request === state.holdRequest) dom.confirm.disabled = false;
  }
}

function startHoldTimer() {
  clearInterval(state.timerId);
  const updateTimer = () => {
    if (!state.hold) return;
    const remaining = Math.ceil((state.hold.expiraEn.getTime() - Date.now()) / 1000);
    if (remaining <= 0) {
      state.holdRequest += 1;
      releaseCurrentHold();
      showStatus("La retención venció. Elige nuevamente el horario.", "error");
      loadAvailableTimes();
      return;
    }
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    dom.timer.textContent = `Horario retenido · ${minutes}:${seconds}`;
    dom.timer.hidden = false;
  };
  updateTimer();
  state.timerId = setInterval(updateTimer, 1000);
}

async function confirmBooking(event) {
  event.preventDefault();
  if (!state.hold) {
    showStatus("Selecciona una hora disponible para continuar.", "error");
    return;
  }
  if (!state.hold.estaVigente()) {
    state.holdRequest += 1;
    await releaseCurrentHold();
    await loadAvailableTimes();
    showStatus("La retención venció. Elige nuevamente el horario.", "error");
    return;
  }

  dom.confirm.disabled = true;
  dom.close.disabled = true;
  dom.customerName.disabled = true;
  dom.specialist.disabled = true;
  dom.date.disabled = true;
  dom.time.disabled = true;
  dom.notes.disabled = true;
  showStatus("Confirmando la cita...", "info");
  let confirmed = false;
  try {
    const cliente = new Cliente({ nombre: dom.customerName.value.trim() });
    const specialist = state.specialists.find(item => item.id === Number(dom.specialist.value));
    const booking = {
      cliente,
      servicio: state.service,
      especialista: specialist,
      fecha: dom.date.value,
      hora: dom.time.value
    };
    const code = await confirmarRetencion(
      state.hold,
      dom.notes.value.trim(),
      cliente.nombre
    );
    state.hold = null;
    clearInterval(state.timerId);
    state.timerId = null;
    dom.timer.hidden = true;
    dom.confirm.textContent = "Cita confirmada";
    showStatus(`¡Reserva confirmada! Tu código de reserva es ${code}.`, "success");
    showReceipt(booking, code);
    confirmed = true;
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    dom.confirm.disabled = confirmed;
    dom.close.disabled = false;
    dom.customerName.disabled = false;
    dom.specialist.disabled = state.specialists.length === 0;
    dom.date.disabled = false;
    dom.time.disabled = false;
    dom.notes.disabled = false;
  }
}

function showReceipt(booking, code) {
  dom.receiptCode.textContent = code;
  dom.receiptCustomer.textContent = booking.cliente.nombre;
  dom.receiptService.textContent = booking.servicio.nombre;
  dom.receiptSpecialist.textContent = booking.especialista?.nombre ?? "No asignado";
  dom.receiptDate.textContent = formatAppointmentDate(booking.fecha);
  dom.receiptTime.textContent = booking.hora;
  dom.receipt.showModal();
  document.querySelector("#closeReceipt").focus();
}

async function closeBooking() {
  if (dom.receipt.open) dom.receipt.close();
  state.holdRequest += 1;
  await releaseCurrentHold();
  state.service = null;
  dom.bookingForm.reset();
  dom.confirm.disabled = false;
  dom.confirm.textContent = "Confirmar reserva";
  dom.bookingSection.hidden = true;
  clearStatus();
}

function bindEvents() {
  dom.search.addEventListener("input", renderBusinesses);
  dom.categoryFilter.addEventListener("change", renderBusinesses);

  // Solo Barberías está activa. Las cuatro tarjetas "Próximamente" son contenido
  // informativo y no reciben eventos ni enlaces.
  dom.categoryList.addEventListener("click", event => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    dom.categoryList.querySelectorAll("[data-category]").forEach(card => {
      card.classList.toggle("is-active", card === button);
      card.setAttribute("aria-pressed", String(card === button));
    });
    dom.categoryFilter.value = button.dataset.category;
    renderBusinesses();
  });

  dom.businesses.addEventListener("click", event => {
    const button = event.target.closest("[data-business-id]");
    if (!button) return;
    const business = state.businesses.find(item => item.id === Number(button.dataset.businessId));
    if (business) selectBusiness(business);
  });

  dom.services.addEventListener("click", event => {
    const button = event.target.closest("[data-service-id]");
    if (button) openBooking(button.dataset.serviceId);
  });

  dom.specialist.addEventListener("change", loadAvailableTimes);
  dom.date.addEventListener("change", loadAvailableTimes);
  dom.time.addEventListener("change", createHold);
  dom.bookingForm.addEventListener("submit", confirmBooking);
  dom.close.addEventListener("click", closeBooking);
  document.querySelector("#closeReceipt").addEventListener("click", () => dom.receipt.close());
  dom.receipt.addEventListener("click", event => {
    if (event.target === dom.receipt) dom.receipt.close();
  });
  dom.receipt.addEventListener("close", () => {
    if (!dom.bookingSection.hidden) dom.close.focus();
  });
}

async function initialize() {
  document.querySelector("#currentYear").textContent = String(new Date().getFullYear());
  bindEvents();
  dom.businesses.setAttribute("aria-busy", "true");

  try {
    state.businesses = await listarNegocios();
    const barberia = state.businesses.find(business => business.categoria === "Barbería");
    if (!barberia) {
      dom.businesses.innerHTML = '<p class="empty-state">La API no tiene una barbería activa para mostrar.</p>';
      return;
    }
    dom.categoryFilter.value = "Barbería";
    renderBusinesses();
    await selectBusiness(barberia);
  } catch (error) {
    dom.businesses.innerHTML = `<p class="empty-state" role="alert">${escapeHtml(error.message)}</p>`;
  } finally {
    dom.businesses.removeAttribute("aria-busy");
  }
}

// Extensiones previstas:
// HU08/HU13: vistas y formularios de administración de servicios.
// HU09/HU11: historial, cancelación y agenda de citas.
initialize();
