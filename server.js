// Servidor estático sencillo para compartir CitasPegy dentro de una red local.
// No expone base de datos ni sustituye un backend de producción.
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 5501);
const TIPOS = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
};

const server = createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
        res.end("Método no permitido");
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Ruta inválida");
        return;
    }

    const archivoRelativo = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const archivo = path.resolve(ROOT, archivoRelativo);
    if (archivo !== ROOT && !archivo.startsWith(`${ROOT}${path.sep}`)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Acceso denegado");
        return;
    }

    try {
        const info = await stat(archivo);
        if (!info.isFile()) throw new Error("No es un archivo");
        const contenido = await readFile(archivo);
        res.writeHead(200, {
            "Content-Type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream",
            "Content-Length": contenido.length,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-cache"
        });
        res.end(req.method === "HEAD" ? undefined : contenido);
    } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("No se encontró la página solicitada");
    }
});

server.listen(PORT, HOST, () => {
    console.log(`CitasPegy disponible en este equipo: http://localhost:${PORT}`);
    console.log("Para abrirla en otro dispositivo, conéctalo a la misma red Wi-Fi y visita una de estas direcciones:");
    for (const interfaces of Object.values(networkInterfaces())) {
        for (const interfaz of interfaces ?? []) {
            if (interfaz.family === "IPv4" && !interfaz.internal) {
                console.log(`  http://${interfaz.address}:${PORT}`);
            }
        }
    }
    console.log("Mantén esta terminal abierta mientras compartes la página. Ctrl+C para detener.");
});

server.on("error", error => {
    if (error.code === "EADDRINUSE") {
        console.error(`El puerto ${PORT} ya está ocupado. Cierra el otro servidor o usa otro PORT.`);
    } else {
        console.error("No se pudo iniciar el servidor:", error.message);
    }
    process.exitCode = 1;
});
