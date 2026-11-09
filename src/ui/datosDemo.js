// Datos de ejemplo para la interfaz web. Se cargan al abrir la página.

import Administracion from '../classes/administracion.js';
import { guardarPersona, generarIdPersona } from '../repository/personaRepository.js';
import { registrarCliente } from '../services/usuarioService.js';
import {
    crearNegocio, crearServicio, registrarEspecialista
} from '../services/negocioService.js';
import {
    reservarTemporal, confirmarCita, completarCita, marcarNoAsistio
} from '../services/citaService.js';

export const CREDENCIALES_DEMO = {
    cliente: { correo: "ana@correo.com", contrasena: "clave123" },
    admin: { correo: "admin@citaspegy.com", contrasena: "admin123" }
};

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diasDesdeHoy = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

export function cargarDatosDemo() {
    // Usuarios
    const ana = registrarCliente("CC", "Ana", "Torres", "3001234567", CREDENCIALES_DEMO.cliente.correo, CREDENCIALES_DEMO.cliente.contrasena, CREDENCIALES_DEMO.cliente.contrasena);
    guardarPersona(new Administracion(generarIdPersona(), "CC", "Paola", "Durango", "3010000000",
        CREDENCIALES_DEMO.admin.correo, CREDENCIALES_DEMO.admin.contrasena, null));

    // Negocios, servicios y especialistas
    const barberia = crearNegocio("Barbería El Corte", "Barbería", "Calle 10 #20-30, Medellín", "6041234567");
    const spa = crearNegocio("Spa Sereno", "Spa", "Carrera 43A #5-10, Medellín", "6047654321");
    const consultorio = crearNegocio("Consultorio Dental Sonríe", "Consultorio", "Avenida 80 #45-12, Medellín", "6045551122");
    const restaurante = crearNegocio("Restaurante La Mesa", "Restaurante", "Calle 33 #70-15, Medellín", "6043332211");

    const corte = crearServicio(barberia.businessId, "Corte de cabello", "Corte clásico con lavado y secado.", 45, 35000);
    const barba = crearServicio(barberia.businessId, "arreglo de barba", "Perfilado y toalla caliente.", 30, 20000);
    crearServicio(barberia.businessId, "Corte + barba", "Corte de cabello y perfilado de barba en una sola sesión.", 60, 50000);
    crearServicio(barberia.businessId, "Afeitado clásico", "Afeitado tradicional con navaja y toalla caliente.", 30, 25000);
    crearServicio(barberia.businessId, "Lavado y peinado", "Lavado capilar y peinado con productos profesionales.", 30, 18000);
    crearServicio(barberia.businessId, "Diseño de cejas", "Perfilado de cejas con acabado limpio.", 15, 12000);
    crearServicio(barberia.businessId, "Tinte de cabello", "Aplicación de tinte; el valor puede variar según el largo.", 90, 80000);
    crearServicio(spa.businessId, "Masaje relajante", "Masaje de cuerpo completo de 60 minutos.", 60, 90000);
    crearServicio(spa.businessId, "Limpieza facial", "Limpieza profunda e hidratación.", 60, 75000);
    crearServicio(consultorio.businessId, "Valoración odontológica", "Revisión general y plan de tratamiento.", 30, 50000);
    crearServicio(consultorio.businessId, "Limpieza dental", "Profilaxis y pulido.", 60, 80000);
    crearServicio(restaurante.businessId, "Mesa para 2 personas", "Reserva de mesa por 60 minutos.", 60, 0);
    crearServicio(restaurante.businessId, "Mesa para 6 personas", "Reserva de mesa familiar por 90 minutos.", 90, 0);

    const yonyLopez = registrarEspecialista(barberia.businessId, "CC", "Yony", "Lopez", "3022222222", "yony@correo.com", "e1", "Barbera");
    const paola = registrarEspecialista(barberia.businessId, "CC", "Paola", "Ríos", "3033333333", "paola@correo.com", "e2", "Barbero");
    registrarEspecialista(spa.businessId, "CC", "Gabriela", "Gil", "3044444444", "gabriela@correo.com", "e3", "Terapeuta");
    registrarEspecialista(consultorio.businessId, "CC", "Dr. Stiven", "Vélez", "3055555555", "stiven@correo.com", "e4", "Odontólogo");
    registrarEspecialista(restaurante.businessId, "CC", "Sala", "Principal", "3066666666", "sala@correo.com", "e5", "Anfitrión");

    // Citas pasadas de Ana para mostrar los estados en "Mis citas" y en las métricas.
    const semanaPasada = iso(diasDesdeHoy(-7));
    const hace3 = iso(diasDesdeHoy(-3));
    const antes = (f, hora) => new Date(`${f}T${hora}:00`);
    const crearPasada = (esp, srv, fecha, hora) => {
        const base = new Date(antes(fecha, hora).getTime() - 24 * 3600 * 1000);
        const b = reservarTemporal(ana.id, esp.id, srv.serviceId, fecha, hora, base);
        return confirmarCita(b.id, "", base);
    };
    const c1 = crearPasada(yonyLopez, corte, semanaPasada, "10:15");
    completarCita(c1.agendaId, new Date(antes(semanaPasada, "12:00")));
    const c2 = crearPasada(paola, barba, hace3, "15:30");
    marcarNoAsistio(c2.agendaId, new Date(antes(hace3, "18:00")));
}
