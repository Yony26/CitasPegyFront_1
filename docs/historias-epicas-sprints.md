# CitasPegy — Épicas, historias de usuario y plan de sprints

> Documento funcional del proyecto. Las historias marcadas **Implementada** describen funciones disponibles en el prototipo. Las marcadas **Pendiente** son recomendaciones para una siguiente versión. El sistema actual almacena los datos en memoria del navegador/servidor Node y los pierde al reiniciar.

## Épicas

### EP-01 — Cuenta y acceso
Registro e inicio de sesión de clientes y acceso del administrador a las funciones de gestión.

### EP-02 — Descubrimiento del catálogo
Búsqueda de negocios, consulta de servicios, precios, duración y especialistas disponibles.

### EP-03 — Reserva y administración de citas
Consulta de disponibilidad, reserva temporal, confirmación, comprobante, historial, cancelación, reprogramación y cierre de citas.

### EP-04 — Administración del negocio
Gestión del catálogo de servicios, especialistas, agenda diaria y estado de las citas.

### EP-05 — Reportes y seguimiento
Consulta de indicadores por período, ingresos asociados a citas atendidas y exportación para análisis.

## Historias de usuario

### EP-01 — Cuenta y acceso

**HU-01 — Crear cuenta de cliente** · **Implementada**  
Como visitante, quiero registrarme con mis datos y contraseña para poder reservar citas.  
**Aceptación:** se solicitan datos de contacto y credenciales; la contraseña y su confirmación deben coincidir; al completar el registro la sesión queda iniciada.

**HU-02 — Iniciar y cerrar sesión** · **Implementada**  
Como usuario, quiero ingresar y cerrar sesión para acceder a las funciones correspondientes a mi rol.  
**Aceptación:** credenciales inválidas muestran un error; el administrador entra al panel y el cliente al catálogo; al cerrar sesión se vuelve al catálogo.

### EP-02 — Descubrimiento del catálogo

**HU-03 — Buscar y filtrar negocios** · **Implementada**  
Como visitante, quiero buscar negocios por nombre y categoría para encontrar el lugar que necesito.  
**Aceptación:** se puede filtrar por texto y tipo, limpiar los filtros y ver un mensaje cuando no hay coincidencias.

**HU-04 — Consultar servicios del negocio** · **Implementada**  
Como cliente, quiero ver los servicios activos, su descripción, duración, precio y especialistas para elegir con información suficiente.  
**Aceptación:** los servicios inactivos no aparecen para nuevas reservas; el precio se muestra en pesos colombianos.

### EP-03 — Reserva y administración de citas

**HU-05 — Consultar horarios disponibles** · **Implementada**  
Como cliente, quiero elegir un especialista (o cualquiera disponible), fecha y horario para encontrar una cita compatible.  
**Aceptación:** no se ofrecen horarios pasados ni franjas ocupadas; la duración del servicio determina el espacio requerido.

**HU-06 — Retener temporalmente un horario** · **Implementada en el prototipo local**
Como cliente, quiero que el horario seleccionado se reserve temporalmente mientras completo la confirmación.  
**Aceptación:** la retención dura cinco minutos; en esta ejecución local los bloqueos y las citas solapadas se excluyen y se revalidan al confirmar. Al expirar, el horario se libera y se informa al usuario. La exclusión entre diferentes navegadores/servidores y la revalidación transaccional en base de datos requieren un backend; el prototipo en memoria no las garantiza.

**HU-07 — Confirmar cita y obtener comprobante** · **Implementada en el prototipo local**
Como cliente, quiero confirmar mi reserva y recibir un código de reserva con el precio acordado.  
**Aceptación:** se revalida la disponibilidad antes de confirmar; la cita queda confirmada, aparece en historial y agenda, y se muestra el comprobante con negocio, servicio, especialista, fecha, hora, estado, código y precio histórico. El prototipo no envía notificaciones al negocio; para cumplir esa aceptación en producción se necesita un backend que persista la confirmación y entregue la notificación.

**HU-08 — Consultar historial de citas** · **Implementada**  
Como cliente, quiero consultar mis citas y filtrarlas por estado para dar seguimiento a mis reservas.  
**Aceptación:** las citas se muestran ordenadas por fecha; cada fila identifica negocio, servicio, especialista, código y estado.

**HU-09 — Cancelar cita** · **Implementada**  
Como cliente, quiero cancelar una cita confirmada cuando ya no pueda asistir.  
**Aceptación:** solo se permite hasta dos horas antes; la franja se libera y las citas finalizadas no se pueden cancelar.

**HU-10 — Reprogramar cita** · **Implementada**  
Como cliente, quiero cambiar fecha y hora de una cita conservando el código de reserva.  
**Aceptación:** el nuevo horario debe estar disponible; la cita anterior se cancela y la nueva conserva servicio, especialista, precio y código.

**HU-11 — Ver agenda diaria** · **Implementada**  
Como administrador, quiero consultar las citas de un especialista por fecha para organizar la atención del negocio.  
**Aceptación:** las citas se ordenan por hora y muestran cliente, servicio, notas y estado.

**HU-12 — Cerrar la atención de una cita** · **Implementada**  
Como administrador, quiero marcar una cita como atendida o como inasistencia para mantener actualizado su estado.  
**Aceptación:** solo citas confirmadas y cuya hora ya inició se pueden cerrar; las citas vencidas también pueden marcarse automáticamente como inasistencia.

### EP-04 — Administración del negocio

**HU-13 — Crear servicio** · **Implementada**  
Como administrador, quiero agregar un servicio con nombre, descripción, duración y precio para ofrecerlo en el catálogo.  
**Aceptación:** el negocio debe existir, el nombre y descripción son obligatorios, la duración debe ser mayor que cero y el precio no puede ser negativo.

**HU-14 — Editar servicio y precio** · **Implementada**  
Como administrador, quiero actualizar la información y el precio de un servicio para mantener vigente la oferta.  
**Aceptación:** los cambios se reflejan en nuevas reservas; las citas ya confirmadas conservan el precio que tenían al reservarse.

**HU-15 — Desactivar servicio** · **Implementada**  
Como administrador, quiero retirar temporalmente un servicio sin borrar las citas históricas asociadas.  
**Aceptación:** el servicio deja de ofrecerse para nuevas reservas y sus citas previas permanecen consultables.

**HU-16 — Registrar especialista** · **Implementada**  
Como administrador, quiero registrar especialistas asociados a mi negocio para que los clientes puedan seleccionarlos al reservar.

**HU-17 — Guardar disponibilidad semanal de especialistas** · **Pendiente**  
Como administrador, quiero configurar horarios laborales, descansos y días no laborables de cada especialista para que la agenda refleje su disponibilidad real.  
**Aceptación:** no se ofrecen franjas fuera del horario configurado; los cambios no alteran citas existentes.

### EP-05 — Reportes y seguimiento

**HU-18 — Consultar métricas del negocio** · **Implementada**  
Como administrador, quiero filtrar las métricas por fechas para conocer el volumen y estado de las citas.  
**Aceptación:** el período muestra citas totales, confirmadas, atendidas, canceladas, inasistencias y porcentaje de inasistencia.

**HU-19 — Consultar ingresos por servicio** · **Implementada**  
Como administrador, quiero ver citas atendidas e ingresos por servicio en un período para evaluar el desempeño del catálogo.  
**Aceptación:** solo las citas atendidas generan ingresos; el cálculo usa el precio histórico de cada cita, incluso si luego cambia el precio del servicio.

**HU-20 — Exportar reporte** · **Implementada**  
Como administrador, quiero descargar el reporte filtrado en CSV para abrirlo en una hoja de cálculo.  
**Aceptación:** el archivo incluye rango de fechas, totales por estado, ingresos y desglose de citas/atenciones/ingresos por servicio.

**HU-21 — Persistir información del negocio** · **Pendiente**  
Como administrador, quiero que usuarios, servicios y citas se guarden de forma permanente para no perder la información al reiniciar la aplicación.  
**Aceptación:** los datos se recuperan después de reiniciar; las operaciones persistentes validan permisos en el servidor.

**HU-22 — Solicitar recuperación de contraseña** · **Interfaz lista; envío real pendiente de backend**  
Como usuario que olvidó su contraseña, quiero solicitar un código al correo electrónico o teléfono de mi cuenta para verificar que soy su propietario.  
**Aceptación:** la respuesta es genérica para no revelar si la cuenta existe; el código es de un solo uso, expira y se envía por un proveedor configurado en el backend.

**HU-23 — Restablecer contraseña con código** · **Interfaz lista; validación real pendiente de backend**  
Como usuario, quiero ingresar el código recibido y definir una nueva contraseña para recuperar el acceso a mi cuenta.  
**Aceptación:** el servidor verifica código, destino y vigencia; la contraseña se almacena como hash y el código queda invalidado después de usarse.

## Plan de sprints propuesto

### Sprint 1 — Catálogo de barbería y administración de servicios
**Objetivo:** ofrecer un catálogo de barbería más completo y permitir su mantenimiento desde el panel.  
**Historias:** HU-04, HU-13, HU-14, HU-15.  
**Entregables:** catálogo de corte, barba, afeitado, lavado/peinado, cejas y tinte; alta, edición de descripción/duración/precio y baja lógica; validación de datos y comprobación manual como administrador y cliente.  
**Criterio de terminado:** los servicios activos aparecen para reservar, los inactivos no y la edición conserva el precio histórico de citas existentes.

### Sprint 2 — Reservas, agenda y reportes
**Objetivo:** ofrecer seguimiento operativo y financiero del período.  
**Historias:** HU-05 a HU-12, HU-18 a HU-20.  
**Entregables:** reporte por fechas, conteo por estado, ingresos por atenciones completadas, desglose por servicio y descarga CSV.  
**Criterio de terminado:** los ingresos del panel y del CSV coinciden y excluyen cancelaciones, confirmaciones e inasistencias.

### Sprint 3 — Persistencia y disponibilidad
**Objetivo:** preparar el prototipo para uso continuo.  
**Historias:** HU-17, HU-21, HU-22 y HU-23.  
**Entregables:** almacenamiento persistente, horarios semanales y días de excepción, API de recuperación, integración de correo/SMS, validación de permisos fuera de la interfaz y pruebas automatizadas.  
**Criterio de terminado:** los datos sobreviven reinicios y no se pueden modificar operaciones administrativas desde una sesión de cliente.

## Reglas y notas de alcance

- Los importes se expresan en pesos colombianos (COP), sin decimales en la interfaz.
- Para reportes, “ingreso” significa el precio acordado en una cita marcada **Atendida**; no es una integración contable ni representa pagos verificados.
- El prototipo actual se ejecuta en frontend y mantiene repositorios en memoria. La verificación de rol en la interfaz sirve para demostración, no reemplaza autenticación/autorización en un backend de producción.
- La pantalla de recuperación y el cliente de API están preparados; el envío efectivo de correo/SMS requiere implementar los endpoints, conectar SQL Server y configurar un proveedor. Ver `docs/conexion-sql-server.md`.
- La capacidad de registrar especialistas existe en la capa de servicios; una pantalla administrativa completa para ello queda por desarrollar.
