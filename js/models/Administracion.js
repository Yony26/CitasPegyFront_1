/** Administración local de citas para demostración; en producción debe vivir en el backend. */
const APPOINTMENTS_KEY = "citaspegy.appointments";
const ESTADOS = new Set(["Pendiente", "Confirmada", "Atendida", "No atendida", "Cancelada"]);

function leerCitas() {
  try {
    const citas = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) ?? "[]");
    return Array.isArray(citas) ? citas : [];
  } catch {
    return [];
  }
}

export default class Administracion {
  static registrarCita(cita) {
    const citas = leerCitas();
    citas.unshift({
      ...cita,
      categoria: cita.categoria || "Sin categoría",
      estado: "Confirmada",
      asistencia: "Pendiente",
      creadaEn: new Date().toISOString()
    });
    try {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(citas));
    } catch {
      // La reserva confirmada no debe fallar por almacenamiento local deshabilitado.
    }
  }

  static listarCitas({ fecha = "", categoria = "", estado = "" } = {}) {
    return leerCitas().map(cita => ({
      ...cita,
      categoria: cita.categoria || "Sin categoría",
      estado: cita.estado === "Completada" ? "Atendida" : (cita.estado || "Pendiente"),
      asistencia: cita.asistencia || (cita.estado === "Completada" ? "Atendida" : "Pendiente")
    })).filter(cita =>
      (!fecha || cita.fecha === fecha) &&
      (!categoria || cita.categoria === categoria) &&
      (!estado || cita.estado === estado)
    );
  }

  static generarReporte({ fecha = "", categoria = "" } = {}) {
    const citas = this.listarCitas({ fecha, categoria });
    const estados = Object.fromEntries([...ESTADOS].map(estado => [estado, 0]));
    const categorias = new Map();
    for (const cita of citas) {
      estados[cita.estado] = (estados[cita.estado] ?? 0) + 1;
      if (!categorias.has(cita.categoria)) {
        categorias.set(cita.categoria, { categoria: cita.categoria, total: 0, estados: { ...Object.fromEntries([...ESTADOS].map(estado => [estado, 0])) } });
      }
      const resumen = categorias.get(cita.categoria);
      resumen.total += 1;
      resumen.estados[cita.estado] = (resumen.estados[cita.estado] ?? 0) + 1;
    }
    return { total: citas.length, estados, categorias: [...categorias.values()], citas };
  }

  static actualizarEstado(codigo, estado) {
    if (!ESTADOS.has(estado)) throw new Error("El estado seleccionado no es válido.");
    const citas = leerCitas();
    const cita = citas.find(item => item.codigo === codigo);
    if (!cita) throw new Error("No se encontró la cita seleccionada.");
    cita.estado = estado;
    cita.asistencia = estado === "Atendida" || estado === "No atendida"
      ? estado
      : (estado === "Cancelada" ? "No aplica" : "Pendiente");
    try {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(citas));
    } catch {
      throw new Error("No fue posible guardar el estado en este navegador.");
    }
    return cita;
  }
}
