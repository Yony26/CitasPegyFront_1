# Bitácora de CitasPegy

Usa esta carpeta para registrar decisiones del proyecto, avances por sesión y cambios en el contrato de la API. Evita guardar contraseñas, tokens, datos reales de clientes u otra información privada.

## Contrato de reservas propuesto

El adaptador de `js/Datos.js` usa estas rutas cuando se configura `CITASPEGY_API_URL` en `index.html`:

- `GET /api/businesses`: lista de negocios con identificador, nombre y categoría.
- `GET /api/businesses/{id}/services`: lista de servicios (`serviceId`, `name`, `description`, `durationMinutes`, `price`).
- `GET /api/businesses/{id}/specialists`: lista de especialistas (`specialistId`, `name`, `role`).
- `GET /api/appointments/availability?serviceId=...&specialistId=...&date=...`: `{ "availableTimes": ["09:00", "09:30"] }`.
- `POST /api/appointments/holds`: recibe `{ "serviceId": 1, "specialistId": 1, "date": "2026-11-12", "time": "10:00", "notes": "" }` y responde `{ "holdId": "hold-123", "expiresAt": "..." }`.
- `POST /api/appointments/holds/{holdId}/confirm`: recibe `{ "notes": "" }` y responde `{ "bookingCode": "CP-0001" }`.
- `DELETE /api/appointments/holds/{holdId}`: libera una retención y puede responder `204 No Content`.

Las rutas y nombres de los campos son un contrato de ejemplo: coordínalos con tus controladores Java. El backend debe volver a validar disponibilidad, expirar retenciones en cinco minutos y generar el código de reserva; el temporizador del navegador no evita colisiones entre usuarios.
