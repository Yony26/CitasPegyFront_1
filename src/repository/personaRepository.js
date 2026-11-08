// Repositorio de Personas - CitasPegy
// Almacenamiento en memoria (arrays). Guarda y busca clientes, especialistas y administradores.

const personas = [];
let siguienteId = 1;

export function generarIdPersona() {
    return siguienteId++;
}

export function guardarPersona(persona) {
    if (personas.some(p => p.correoElectronico === persona.correoElectronico)) {
        throw new Error("Ya existe un usuario con ese correo electrónico");
    }
    personas.push(persona);
    return persona;
}

export function buscarPersonaPorId(id) {
    const persona = personas.find(p => p.id === id);
    if (!persona) throw new Error(`No se encontró ninguna persona con el id ${id}`);
    return persona;
}

export function buscarPersonaPorCorreo(correo) {
    return personas.find(p => p.correoElectronico === correo) ?? null;
}

export function correoEnUso(correo, excluirId = null) {
    return personas.some(p => p.correoElectronico.toLowerCase() === correo.toLowerCase() && p.id !== excluirId);
}

export function listarPersonasPorTipo(clase) {
    return personas.filter(p => p instanceof clase);
}
