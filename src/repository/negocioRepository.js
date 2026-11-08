// Repositorio de Negocios y Servicios - CitasPegy
// Almacenamiento en memoria.

const negocios = [];
const servicios = [];
let siguienteNegocio = 1;
let siguienteServicio = 1;

export function generarIdNegocio() { return siguienteNegocio++; }
export function generarIdServicio() { return siguienteServicio++; }

export function guardarNegocio(negocio) { negocios.push(negocio); return negocio; }
export function guardarServicio(servicio) { servicios.push(servicio); return servicio; }

export function listarNegocios() { return [...negocios]; }

export function buscarNegocioPorId(id) {
    const n = negocios.find(x => x.businessId === id);
    if (!n) throw new Error(`No se encontró ningún negocio con el id ${id}`);
    return n;
}

export function buscarServicioPorId(id) {
    const s = servicios.find(x => x.serviceId === id);
    if (!s) throw new Error(`No se encontró ningún servicio con el id ${id}`);
    return s;
}

export function listarServiciosPorNegocio(negocioId) {
    return servicios.filter(s => s.negocioId === negocioId);
}
