/**
 * Sesión de demostración en sessionStorage. Nunca conserva contraseñas.
 * Para producción, reemplazar por autenticación y autorización del backend.
 */
const SESSION_KEY = "citaspegy.session";
const USERS_KEY = "citaspegy.users";

function leerSesion() {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function leerUsuarios() {
  try {
    const usuarios = JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
    return Array.isArray(usuarios) ? usuarios : [];
  } catch {
    return [];
  }
}

async function hashContrasena(contrasena, salt) {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("El inicio de sesión requiere un navegador seguro (HTTPS o localhost).");
  }
  const clave = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(contrasena),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const digest = await globalThis.crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: Uint8Array.from(salt.match(/.{2}/g), byte => Number.parseInt(byte, 16)),
    iterations: 210000,
    hash: "SHA-256"
  }, clave, 256);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function crearSalt() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("El inicio de sesión requiere un navegador seguro (HTTPS o localhost).");
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function guardarSesion(usuario) {
  const { salt, passwordHash, ...datosSesion } = usuario;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(datosSesion));
  } catch {
    throw new Error("No fue posible guardar la sesión en este navegador.");
  }
  return datosSesion;
}

function validarDatos(datos) {
  const nombre = String(datos.nombre ?? "").trim();
  const identificacion = String(datos.identificacion ?? "").trim();
  const telefono = String(datos.telefono ?? "").trim();
  const correo = String(datos.correo ?? "").trim().toLowerCase();
  if (nombre.length < 3) throw new Error("Escribe tu nombre completo.");
  if (identificacion.length < 5) throw new Error("Verifica tu número de identificación.");
  if (!/^\+?[\d\s()-]{7,20}$/.test(telefono)) throw new Error("Verifica tu número de teléfono.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error("Escribe un correo electrónico válido.");
  return { nombre, identificacion, telefono, correo };
}

export function obtenerSesion() {
  return leerSesion();
}

export function cerrarSesion() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    throw new Error("No fue posible cerrar la sesión en este navegador.");
  }
}

export async function registrarUsuario(datos) {
  const rol = datos.rol === "Administrador" ? "Administrador" : "Cliente";
  if (
    rol === "Administrador" &&
    (!globalThis.CITASPEGY_ADMIN_INVITE_CODE ||
      String(datos.codigoInvitacion ?? "") !== globalThis.CITASPEGY_ADMIN_INVITE_CODE)
  ) {
    throw new Error("El código de invitación administrativa no es válido.");
  }
  const perfil = {
    ...validarDatos(datos),
    rol,
    id: globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
  };
  const contrasena = String(datos.contrasena ?? "");
  if (contrasena.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }
  const usuarios = leerUsuarios();
  if (usuarios.some(usuario => usuario.correo === perfil.correo)) {
    throw new Error("Ya existe una cuenta con ese correo. Inicia sesión.");
  }
  const salt = crearSalt();
  const usuario = { ...perfil, salt, passwordHash: await hashContrasena(contrasena, salt) };
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify([...usuarios, usuario]));
  } catch {
    throw new Error("No fue posible guardar la cuenta en este navegador.");
  }
  return guardarSesion(usuario);
}

export async function iniciarSesion(correo, contrasena) {
  const email = String(correo ?? "").trim().toLowerCase();
  const password = String(contrasena ?? "");
  const usuario = leerUsuarios().find(item => item.correo === email);
  if (!usuario || !usuario.salt || !usuario.passwordHash) {
    throw new Error("No encontramos una cuenta con ese correo. Verifica los datos o regístrate.");
  }
  const hash = await hashContrasena(password, usuario.salt);
  if (hash !== usuario.passwordHash) throw new Error("El correo o la contraseña no son correctos.");
  return guardarSesion(usuario);
}

export function actualizarPerfil(datos) {
  const sesion = leerSesion();
  if (!sesion) throw new Error("Regístrate para continuar.");
  const usuario = { ...validarDatos({ ...sesion, ...datos }), id: sesion.id, rol: sesion.rol ?? "Cliente" };
  try {
    const usuarios = leerUsuarios();
    const indice = usuarios.findIndex(item => item.id === sesion.id);
    if (indice >= 0) {
      usuarios[indice] = { ...usuarios[indice], ...usuario };
      localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
  } catch {
    throw new Error("No fue posible guardar los cambios en este navegador.");
  }
  return usuario;
}
