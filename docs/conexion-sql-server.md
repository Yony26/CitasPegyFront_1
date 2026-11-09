# Conexión de CitasPegy con SQL Server y recuperación de contraseña

## Lo que ya incluye este proyecto

- El inicio de sesión ahora ofrece **¿Olvidaste tu contraseña?**.
- El formulario permite solicitar un código por **correo electrónico** o por **SMS**, y luego ingresarlo para establecer una nueva contraseña.
- La interfaz consume dos endpoints del backend mediante `src/services/recuperacionService.js`:
  - `POST /api/auth/password/forgot` con `{ "canal": "email" | "sms", "destino": "..." }`.
  - `POST /api/auth/password/reset` con `{ "canal": "email" | "sms", "destino": "...", "codigo": "...", "nuevaContrasena": "..." }`.
- La consulta pública del estado de una cita usa `GET /api/appointments/by-code/:codigo` mediante `src/services/consultaCitaService.js`.
- El archivo `.env.example` sirve como plantilla de configuración del servidor, y `sql/schema-sqlserver.sql` crea las tablas de SQL Server.

## Importante: se requiere backend

La aplicación actual es un frontend estático y sus cuentas demo se mantienen en memoria. Un navegador no puede conectarse directamente a SQL Server de forma segura ni enviar correos/SMS sin un servidor y un proveedor configurados. Por eso, **la pantalla está lista para conectarse, pero el envío real de códigos necesita implementar y desplegar la API**. Si la API no está disponible, la interfaz informa el problema; no cambia contraseñas localmente ni muestra códigos ficticios.

## Preparar SQL Server

1. Crea una base de datos llamada `CitasPegy` en SQL Server.
2. Abre esa base en SQL Server Management Studio o Azure Data Studio.
3. Ejecuta el contenido de `sql/schema-sqlserver.sql`.
4. Copia `.env.example` a `.env` en la carpeta del backend (el `.env` real no debe compartirse ni subirse al repositorio).
5. Completa `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` con los datos de tu instancia. Usa cifrado (`DB_ENCRYPT=true`) en producción.
6. Configura SMTP para correo y un proveedor SMS para mensajes de texto. Las credenciales de esos proveedores solo deben estar en el backend.
7. Inicia el backend en `CITASPEGY_API_URL` y configura la interfaz para que apunte a esa URL. En desarrollo con el mismo origen, la URL puede ser vacía y se usarán rutas relativas.

## Contrato de consulta de cita

### `GET /api/appointments/by-code/:codigo`

Busca una cita por su código de reserva, por ejemplo `CP-0007`. Responde `200` con los datos públicos mínimos de la cita:

```json
{
  "codigo": "CP-0007",
  "estado": "Confirmada",
  "fecha": "2026-11-12",
  "hora": "10:00",
  "negocio": "Barbería El Corte",
  "servicio": "Corte de cabello"
}
```

Si el código no existe, responde `404`. No incluir datos personales del cliente. Si `CITASPEGY_API_URL` no está configurada, la interfaz consulta los datos de demostración en memoria y avisa que no hay backend conectado.

## Requisitos de backend para HU06 y HU07

El prototipo ejecuta reservas en memoria dentro de una sola página; no puede asegurar exclusión entre navegadores ni persistir la cita. Para cumplir la garantía de producción:

- Crear una retención en el servidor con vencimiento de cinco minutos. Al reservar y al confirmar, validar solapamientos de duración para el especialista y la fecha dentro de una transacción con aislamiento/ bloqueos apropiados. La confirmación debe comprobar que la retención pertenece al cliente y sigue vigente.
- Guardar la cita confirmada y liberar la retención en la misma transacción; rechazar conflictos con una respuesta `409 Conflict` para que el cliente elija otro horario. Las citas no canceladas deben ocupar agenda.
- Generar el código de reserva en el servidor con una restricción de unicidad en la base de datos. El servidor debe ser la autoridad para estado, historial y agenda.
- Tras confirmar, generar una notificación para el negocio en el servidor. Usar una cola/outbox transaccional con reintentos evita perder el aviso si falla el proveedor de correo/SMS o la notificación push.

## Contrato de la API de recuperación

### `POST /api/auth/password/forgot`

Recibe canal y dirección destino. Debe buscar la cuenta por correo o teléfono y responder siempre con un mensaje genérico, aunque la cuenta no exista, para no revelar qué usuarios están registrados.

Respuesta sugerida `202`:

```json
{"message":"Si existe una cuenta con esos datos, enviaremos un código."}
```

Responsabilidades del backend:

- Generar un código criptográficamente aleatorio, de un solo uso, con caducidad breve (por ejemplo, 10 minutos).
- Guardar solo el hash del código en `dbo.PasswordResetTokens`, no el código original.
- Limitar intentos y solicitudes por cuenta/IP, invalidar códigos anteriores y enviar el código por SMTP o por el proveedor SMS.
- No incluir el código en la respuesta HTTP ni en registros de producción.

### `POST /api/auth/password/reset`

Verifica que el canal, destino y código correspondan a una solicitud vigente, no usada ni vencida; valida la política de contraseña; guarda un hash seguro de la nueva contraseña en `dbo.Users.PasswordHash`; marca el código como usado y revoca sesiones previas. La respuesta no debe incluir el hash ni la contraseña.

Respuesta sugerida `200`:

```json
{"message":"Contraseña actualizada."}
```

Errores de código inválido o expirado deben ser genéricos. Limita la longitud de los campos, usa HTTPS en producción y consultas parametrizadas para SQL.

## Tablas incluidas

El esquema crea `Users`, `Businesses`, `Specialists`, `Services`, `Appointments` y `PasswordResetTokens`. `Appointments` conserva el nombre, precio y duración del servicio como snapshot histórico. `Users.PasswordHash` es para hashes BCrypt/Argon2; **no almacenes contraseñas en texto plano**.

## Estado de persistencia del resto de la aplicación

El esquema es la base de datos inicial para migrar el prototipo. Los repositorios que usa actualmente la aplicación siguen siendo arreglos en memoria: ejecutar el script SQL no cambia automáticamente esos repositorios. Para persistir catálogo, cuentas y citas, el backend debe agregar endpoints y el frontend debe consumirlos; no pongas usuario/contraseña SQL dentro de `src/` ni en `index.html`.
