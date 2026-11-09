# CitasPeggy — Front / lógica en JavaScript

Sistema de turnos y citas para negocios (restaurantes, consultorios, spas, barberías). Proyecto Integrador — CESDE.

## Cómo ejecutarlo

```bash
git clone https://github.com/Yony26/CitasPegyFront_1.git
```

**Pantallas (HTML + CSS):** abre `index.html` con un servidor local; no funciona haciendo doble clic porque el navegador bloquea los módulos de JavaScript.
- En VS Code: instala la extensión **Live Server**, clic derecho en `index.html` → *Open with Live Server*.
- O con Node: `npx serve .` y abre la dirección que muestra.
- O con Python: `python -m http.server 8000` y abre http://localhost:8000

Usuarios de prueba: cliente `ana@correo.com` / `clave123` · administrador `admin@citaspeggy.com` / `admin123`.

**Pruebas por consola (Node 18 o superior):** `npm start` corre `src/main.js`, que prueba todas las clases y servicios.

## Recuperación de contraseña y SQL Server

En el inicio de sesión está la opción **¿Olvidaste tu contraseña?**. La interfaz permite solicitar el código por correo o SMS y luego ingresar una contraseña nueva. El envío real requiere conectar los endpoints del backend y configurar un proveedor de correo/SMS; las instrucciones y el contrato están en [docs/conexion-sql-server.md](docs/conexion-sql-server.md).

- Esquema inicial SQL Server: [sql/schema-sqlserver.sql](sql/schema-sqlserver.sql)
- Plantilla de conexión para el backend: [.env.example](.env.example)

## Consulta del estado de una cita

La opción **Consultar cita** permite buscar una reserva por su código (por ejemplo, `CP-0007`) y ver su estado, fecha, hora, negocio y servicio. En modo demostración busca entre las citas en memoria; al configurar `CITASPEGY_API_URL`, consume `GET /api/appointments/by-code/:codigo`. El contrato está en [docs/conexion-sql-server.md](docs/conexion-sql-server.md).

La aplicación de demostración continúa usando repositorios en memoria. No conectes SQL Server directamente desde el navegador ni guardes credenciales reales en el frontend.

## Estructura

```
src/
├── main.js                    pruebas de todo el flujo
├── enums/estadoCita.js        Pendiente, Confirmada, Atendida, No asistió, Cancelada
├── classes/
│   ├── persona.js             clase base (abstracta)
│   ├── administracion.js      hereda de Persona
│   ├── cliente.js             hereda de Persona
│   ├── especialista.js        hereda de Persona
│   ├── negocio.js
│   ├── servicio.js
│   └── ordenDelDia.js         la cita
├── repository/                almacenamiento en memoria
│   ├── personaRepository.js
│   ├── negocioRepository.js
│   └── citaRepository.js
└── services/                  reglas y orquestación
    ├── usuarioService.js      registro e inicio de sesión
    ├── negocioService.js      catálogo, servicios, especialistas
    └── citaService.js         horarios, reserva de 5 min, confirmar, cancelar, métricas
```

## Equipo Scrum

| Rol | Integrante |
|---|---|
| Product Owner | Estiven Bentancur |
| Scrum Master | Yony Lopez |
| Developers | Gabriela Duran, Paola Durango |
