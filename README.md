# CitasPeggy — Front / lógica en JavaScript

Sistema de turnos y citas para negocios (restaurantes, consultorios, spas, barberías). Proyecto Integrador — CESDE.

## Cómo ejecutarlo

```bash
git clone https://github.com/durangor1911-ux/CitasPegyFront.git
cd CitasPegyFront
```

**Pantallas (HTML + CSS):** abre `index.html` con un servidor local; no funciona haciendo doble clic porque el navegador bloquea los módulos de JavaScript.
- En VS Code: instala la extensión **Live Server**, clic derecho en `index.html` → *Open with Live Server*.
- O con Node: `npx serve .` y abre la dirección que muestra.
- O con Python: `python -m http.server 8000` y abre http://localhost:8000

Usuarios de prueba: cliente `ana@correo.com` / `clave123` · administrador `admin@citaspeggy.com` / `admin123`.

**Pruebas por consola (Node 18 o superior):** `npm start` corre `src/main.js`, que prueba todas las clases y servicios.

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
