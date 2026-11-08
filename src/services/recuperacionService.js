// Cliente para la API de recuperación. El correo/SMS y los tokens deben gestionarse
// en el servidor; nunca se envían credenciales de base de datos desde el navegador.
const API_BASE = globalThis.CITASPEGY_API_URL ?? "";

async function solicitarApi(ruta, datos) {
    if (!API_BASE) {
        throw new Error("La recuperación requiere el backend configurado. Consulta docs/conexion-sql-server.md.");
    }
    let respuesta;
    try {
        respuesta = await fetch(`${API_BASE}${ruta}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
    } catch {
        throw new Error("No fue posible conectar con el servidor de recuperación.");
    }
    if (!(respuesta.headers.get("content-type") ?? "").includes("application/json")) {
        throw new Error("El servidor de recuperación no está configurado o no respondió correctamente.");
    }
    const contenido = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(contenido.error || "No fue posible procesar la solicitud.");
    return contenido;
}

/** Solicita al backend un código de un solo uso por correo o SMS. */
export function solicitarCodigoRecuperacion(canal, destino) {
    return solicitarApi("/api/auth/password/forgot", { canal, destino });
}

/** Canjea el código recibido por una nueva contraseña. */
export function restablecerContrasena(canal, destino, codigo, nuevaContrasena) {
    return solicitarApi("/api/auth/password/reset", { canal, destino, codigo, nuevaContrasena });
}
