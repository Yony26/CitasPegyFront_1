// Repositorio de Citas (OrdenDelDia) y bloqueos temporales - CitasPegy
// Almacenamiento en memoria.

const citas = [];
const bloqueos = []; // { id, especialistaId, fecha, startTime, clienteId, servicioId, expiraEn }
let siguienteCita = 1;
let siguienteBloqueo = 1;

export function generarIdCita() { return siguienteCita++; }
export function generarIdBloqueo() { return siguienteBloqueo++; }

// ===== Citas =====
export function guardarCita(cita) { citas.push(cita); return cita; }
export function listarCitas() { return [...citas]; }

export function buscarCitaPorId(id) {
    const c = citas.find(x => x.agendaId === id);
    if (!c) throw new Error(`No se encontró ninguna cita con el id ${id}`);
    return c;
}

export function listarCitasPorCliente(clienteId) {
    return citas.filter(c => c.clienteId === clienteId);
}

export function listarCitasPorEspecialista(especialistaId, fecha = null) {
    return citas.filter(c => c.especialistaId === especialistaId && (!fecha || c.fecha === fecha));
}

export function eliminarCita(id) {
    const i = citas.findIndex(c => c.agendaId === id);
    if (i === -1) throw new Error(`No se encontró ninguna cita con el id ${id}`);
    citas.splice(i, 1);
}

// ===== Bloqueos temporales (reserva de 5 minutos) =====
export function guardarBloqueo(bloqueo) { bloqueos.push(bloqueo); return bloqueo; }
export function listarBloqueos() { return [...bloqueos]; }

export function buscarBloqueo(id) {
    return bloqueos.find(b => b.id === id) ?? null;
}

export function eliminarBloqueosExpirados(ahora = new Date()) {
    for (let i = bloqueos.length - 1; i >= 0; i--) {
        if (bloqueos[i].expiraEn <= ahora) bloqueos.splice(i, 1);
    }
}

export function eliminarBloqueo(id) {
    const i = bloqueos.findIndex(b => b.id === id);
    if (i !== -1) bloqueos.splice(i, 1);
}
