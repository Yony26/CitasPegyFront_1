// Enum EstadoCita - CitasPeggy
// En JavaScript no existe "enum"; se usa un objeto congelado (no se puede modificar).

export const EstadoCita = Object.freeze({
    PENDIENTE: "Pendiente",
    CONFIRMADA: "Confirmada",
    COMPLETADA: "Atendida",
    NO_ASISTIO: "No asistió",
    CANCELADA: "Cancelada"
});
