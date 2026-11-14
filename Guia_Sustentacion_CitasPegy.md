# Guía de estudio y sustentación — CitasPegyFront_1

**Objetivo:** explicar con seguridad qué hace el frontend, cómo se organiza y cuáles son sus límites actuales. Este documento describe el código presente, no funcionalidades futuras.

> **Idea central para la exposición:** CitasPegy es una aplicación frontend modular para consultar un catálogo de barbería, registrar una sesión de demostración y reservar una cita con retención temporal del horario. Puede trabajar con datos locales o consumir una API REST si se configura su URL. La autenticación segura, la autorización real y la persistencia compartida requieren un backend.

## 1. Arquitectura y estructura de carpetas

| Ruta | Responsabilidad |
|---|---|
| [index.html](index.html) | Documento de entrada: estructura semántica, formularios, diálogos y contenedores que JavaScript actualiza. También carga CSS y el módulo principal. |
| [css/styles.css](css/styles.css) | Presentación visual: distribución, componentes, estados, foco, adaptación a pantallas y preferencias de movimiento. Mantiene el estilo separado del marcado y la lógica. |
| [imagenes/](imagenes/) | Recursos gráficos del proyecto, como imágenes de servicios. El HTML y JavaScript referencian estos recursos con rutas relativas. |
| [js/main.js](js/main.js) | Controlador principal de la experiencia cliente: estado de interfaz, renderizado, eventos, registro, reserva, perfil y comprobante. |
| [js/AdministracionApp.js](js/AdministracionApp.js) | Controlador/vista independiente para el panel administrativo y los reportes. |
| [js/Autenticacion.js](js/Autenticacion.js) | Validación, cuentas demo almacenadas localmente e inicio/cierre de sesión. |
| [js/Datos.js](js/Datos.js) | Capa de acceso a datos: catálogo demo, adaptación de respuestas REST y operaciones de disponibilidad/retención. |
| [js/models/](js/models/) | Clases que representan entidades del dominio y normalizan/validan parte de sus datos. |

**Buenas prácticas que sí se aplican:** separación de responsabilidades, módulos ES con `import`/`export`, nombres de dominio en español y transformación de respuestas del backend a modelos del frontend. La organización **se parece a una arquitectura por capas/MVC**: HTML/CSS como vista, `main.js`/`AdministracionApp.js` como controladores, modelos como entidades y `Datos.js` como acceso a datos. No conviene llamarla MVC estricta: no hay un framework ni una capa formal de vistas separada de los controladores.

## 2. Explicación de código: clases y archivos principales

### 2.1 `index.html`: estructura y carga

- Declara idioma español, codificación UTF-8, viewport móvil, descripción y título en el `<head>`; enlaza [css/styles.css](css/styles.css#L1-L8).
- El `<body>` contiene encabezado y navegación; dentro de `<main>` organiza portada, categorías, negocios, servicios, panel administrativo y formulario de reserva. Los controles usan etiquetas, títulos asociados, regiones `aria-live` y estados accesibles.
- Los formularios tienen restricciones HTML como `required`, `type="email"`, `maxlength` y `minlength`. JavaScript complementa estas restricciones con validaciones propias.
- Los comprobantes, el registro y el perfil son elementos `<dialog>`; la administración y la reserva se ocultan inicialmente con `hidden`.
- Al final define `globalThis.CITASPEGY_API_URL`, `globalThis.CITASPEGY_ADMIN_INVITE_CODE` e imágenes por nombre de servicio, y carga [js/main.js](js/main.js#L280-L295) como `type="module"`. El módulo importa sus dependencias; no se incluyen frameworks externos.
- En el estado actual la URL de API está vacía, así que el flujo arranca en modo demo. El código de invitación administrativa también está en el cliente, por lo que **no es un secreto ni una medida de seguridad**.

### 2.2 POO y modelos (`js/models`)

**POO (Programación Orientada a Objetos)** organiza datos y comportamientos relacionados en clases. Aquí los constructores reciben objetos, convierten valores a tipos esperados y validan invariantes básicas. Las clases tienen propiedades públicas; no usan campos privados `#`, herencia ni getters/setters. Por eso es correcto hablar de modelado de entidades y validación, pero no afirmar que existe encapsulamiento estricto.

- **`Negocio`** ([js/models/Negocio.js](js/models/Negocio.js#L1-L36)): representa el establecimiento con identificador, nombre, categoría, dirección, teléfono, calificación, servicios y especialistas. Valida nombre/categoría; `actualizarCatalogo()` reemplaza los catálogos y `coincideConFiltro()` compara texto y categoría. En el catálogo demo agrupa objetos `Servicio` y `Especialista` (composición).
- **`Servicio`** ([js/models/Servicio.js](js/models/Servicio.js#L1-L25)): representa una prestación con nombre, descripción, duración, precio, icono y estado activo. Comprueba nombre y descripción, duración positiva y precio no negativo.
- **`Especialista`** ([js/models/Especialista.js](js/models/Especialista.js#L1-L18)): representa a quien presta el servicio mediante id, nombre, cargo y estado activo; requiere nombre.
- **`Cliente`** ([js/models/Cliente.js](js/models/Cliente.js#L1-L17)): contiene los datos mínimos usados al confirmar la cita: id opcional, nombre y correo. No incluye contraseña.
- **`Cita`** ([js/models/Cita.js](js/models/Cita.js#L1-L39)): representa la retención temporal o cita: ids de servicio/especialista, fecha, hora, duración, cliente, notas, id de retención, vencimiento, código y estado. `estaVigente()` comprueba que la expiración sea una fecha válida y futura.
- **`Administracion`** ([js/models/Administracion.js](js/models/Administracion.js#L1-L81)): ofrece métodos estáticos para registrar, listar, resumir y actualizar citas en almacenamiento local. Es una utilidad del dominio para la demostración, no la autorización del panel.

**Cómo se relacionan:** un `Negocio` ofrece servicios y especialistas; el usuario elige un `Servicio` y un `Especialista`; el proceso crea una `Cita` temporal, la confirma y finalmente registra una representación de la reserva junto con los datos del `Cliente`. En modo API, `Datos.js` transforma DTO del servidor a instancias de los modelos.

### 2.3 `main.js`: controlador de la experiencia cliente

El módulo se puede explicar por bloques ([js/main.js](js/main.js#L1-L30), [js/main.js](js/main.js#L62-L164), [js/main.js](js/main.js#L174-L256), [js/main.js](js/main.js#L270-L546), [js/main.js](js/main.js#L550-L687)):

1. **Dependencias, estado y referencias DOM:** importa operaciones desde `Datos.js`, modelos y autenticación. `state` conserva negocio/servicio seleccionados, catálogos, usuario, retención y contadores de solicitudes. `dom` reúne referencias a elementos HTML para no repetir selectores.
2. **Funciones auxiliares y renderizado:** formatea precio/fecha/duración, presenta estados y escapa texto antes de interpolarlo en `innerHTML`. `renderBusinesses()` filtra con `Negocio.coincideConFiltro()`; `renderServices()` crea tarjetas de servicio.
3. **Selección de negocio:** `selectBusiness()` consulta servicios y especialistas en paralelo mediante `Promise.all()`, actualiza el estado y vuelve a dibujar el catálogo. Usa `try/catch/finally` para error y limpieza del indicador de carga.
4. **Disponibilidad y retención:** `loadAvailableTimes()` consulta horas para servicio, especialista y fecha; libera una retención anterior. `createHold()` solicita una retención al elegir hora y `startHoldTimer()` actualiza el contador cada segundo. Si cambia la selección, los contadores `availabilityRequest` y `holdRequest` permiten ignorar respuestas antiguas. La retención del navegador es una coordinación de interfaz; el servidor debe validar de nuevo para evitar colisiones reales.
5. **Registro y reserva:** si se intenta reservar sin sesión, `openBooking()` conserva el servicio pendiente y abre el registro. `registerAccount()` crea la sesión y retoma la reserva del cliente. `confirmBooking()` verifica sesión y vigencia, deshabilita temporalmente campos, confirma la retención, registra localmente la cita y abre el comprobante. Los campos se restauran en `finally`.
6. **Inicio de sesión, perfil e historial:** el formulario permite crear cuenta o cambiar al formulario de inicio de sesión. `renderProfile()` muestra datos de la sesión y filtra citas locales por id o correo; `saveProfile()` delega la validación y persistencia a `Autenticacion.js`.
7. **Eventos e inicio:** `bindEvents()` conecta eventos de búsqueda, filtros, selección, formularios, diálogos y sesión. Usa delegación de eventos para tarjetas creadas dinámicamente. `initialize()` actualiza el año, decide si abre administración o experiencia cliente, carga el catálogo y selecciona la primera barbería.

### 2.4 `Datos.js`: catálogo y persistencia de reservas

[Datos.js](js/Datos.js#L1-L36) contiene el catálogo demo: una barbería, seis servicios y dos especialistas; las reservas y retenciones demo se guardan en estructuras en memoria. Si `CITASPEGY_API_URL` está vacía, las funciones usan esos datos. Si está configurada, usan `fetch()` y rutas REST como `GET /api/businesses`, consulta de servicios/especialistas, disponibilidad, `POST` para retener/confirmar y `DELETE` para liberar ([js/Datos.js](js/Datos.js#L76-L95), [js/Datos.js](js/Datos.js#L132-L278)).

Las funciones mapeadoras convierten DTO (objetos de transporte recibidos del servidor) con nombres alternativos, por ejemplo `name`/`nombre`, a instancias `Negocio`, `Servicio` y `Especialista`. `solicitar()` centraliza cabeceras, lectura JSON/texto y errores HTTP/red. El modo demo calcula horarios de 08:00 a 17:00, omite horas pasadas del día actual y evita solapamientos con reservas/retenciones en memoria.

**Distinción importante:** `sessionStorage` y `localStorage` sobreviven de manera distinta a una recarga; en cambio, arreglos y mapas de `Datos.js` solo viven mientras siga cargada la pestaña. Aunque se configure API para la reserva, el historial y los reportes actuales siguen obteniéndose de `localStorage` mediante `Administracion`.

### 2.5 `Autenticacion.js`: validación y sesión demo

[Autenticacion.js](js/Autenticacion.js) valida nombre, identificación, teléfono y correo; el registro exige contraseña de al menos ocho caracteres. Las cuentas demo se guardan en `localStorage` (`citaspegy.users`) con una sal aleatoria y un hash PBKDF2; nunca se persiste la contraseña en texto plano. `iniciarSesion()` verifica el correo y la contraseña contra esos datos locales. La sesión activa va en `sessionStorage` (`citaspegy.session`), y `obtenerSesion()`, `cerrarSesion()` y `actualizarPerfil()` leen, eliminan o actualizan sus datos.

La cuenta solo existe en el navegador donde se registró; no se sincroniza entre dispositivos. Las cuentas de versiones anteriores que solo guardaban sesión no tienen credenciales persistidas y deben volver a registrarse para usar el nuevo inicio de sesión.

Esto **no es autenticación real**: no hay verificación de contraseña con servidor, recuperación de cuenta ni token. El rol administrador depende de un código comprobado en el navegador; en producción registro, credenciales y permisos deben implementarse en backend.

### 2.6 `AdministracionApp.js` y `Administracion.js`: panel local

- `iniciarAdministracion()` en [js/AdministracionApp.js](js/AdministracionApp.js#L1-L80) verifica que la sesión local tenga rol administrador, muestra el panel, carga catálogos y prepara filtros. Sus funciones internas renderizan tarjetas/reporte/tabla y generan archivo CSV. También registra listeners para filtros, actualización de estados, exportación y cierre de sesión ([js/AdministracionApp.js](js/AdministracionApp.js#L92-L171)).
- [js/models/Administracion.js](js/models/Administracion.js#L1-L81) usa la clave `citaspegy.appointments` de `localStorage`. `registrarCita()` agrega una cita; `listarCitas()` normaliza estados y aplica filtros; `generarReporte()` cuenta totales por estado/categoría; `actualizarEstado()` valida el estado y persiste el cambio.
- Es un panel de demostración: no debe presentarse como autorización segura ni como reporte multiusuario. Sus datos dependen del navegador donde se creó cada cita.

### 2.7 Persistencia: qué queda guardado y dónde

| Dato | Mecanismo actual | Alcance |
|---|---|---|
| Cuenta demo | `localStorage`, clave `citaspegy.users` | Solo el navegador actual; conserva perfil, sal y hash PBKDF2, no la contraseña en texto plano. |
| Sesión/perfil activo | `sessionStorage`, clave `citaspegy.session` | Sesión del navegador/pestaña; no contiene contraseña. |
| Citas confirmadas, historial y reportes | `localStorage`, clave `citaspegy.appointments` | Persisten en ese navegador; no se comparten con otros usuarios/dispositivos. |
| Retenciones y reservas demo para disponibilidad | `Map`/arreglo en `Datos.js` | Memoria de la página; desaparecen al recargar. |
| Catálogo | Objetos iniciales demo o respuesta API | Demo definida en código; API solo al configurar una URL. |

## 3. Flujo de la aplicación

El navegador interpreta `index.html`, carga estilos y ejecuta `main.js` como módulo; sus imports conectan controlador, modelos, autenticación y datos. `initialize()` consulta el catálogo (local en la configuración actual), dibuja los negocios y servicios y registra los eventos. Cuando el usuario elige un servicio, el controlador comprueba si existe sesión; si no, registra una sesión demo y retoma el proceso. Después consulta horarios, crea una retención temporal al seleccionar una hora y, al confirmar, valida su vigencia, solicita la confirmación, registra los datos locales y presenta un comprobante. Cada interacción actualiza el DOM mediante los eventos registrados; las operaciones de datos son asíncronas aunque el modo demo responda localmente.

## 4. Simulador de sustentación: preguntas y respuestas

### 1. ¿Dónde aplica POO y qué significa encapsulamiento en este proyecto?
**Respuesta ideal:** “Uso clases como `Negocio`, `Servicio`, `Especialista`, `Cliente` y `Cita` para representar conceptos del dominio. Los constructores normalizan y validan sus datos, y `Negocio` ofrece métodos relacionados con su catálogo y filtros. Las propiedades son públicas; por tanto, hay organización orientada a objetos, pero no encapsulamiento estricto con campos privados. No afirmaría que hay herencia porque no la implementé.”

### 2. ¿Por qué separó `Datos.js` de `main.js`?
**Respuesta ideal:** “Para separar la interfaz de la fuente de datos. `main.js` maneja estado, eventos y renderizado; `Datos.js` entrega catálogo, disponibilidad y operaciones de reserva, tanto en modo demo como mediante HTTP. Así reduzco acoplamiento y puedo sustituir la fuente local por una API sin reescribir todo el controlador.”

### 3. ¿Cómo se manipula el DOM y por qué usa delegación de eventos?
**Respuesta ideal:** “Obtengo elementos con `querySelector`, actualizo contenido/atributos y agrego listeners con `addEventListener`. Las tarjetas se recrean dinámicamente, así que escucho el clic en el contenedor y busco el botón con `closest()`. De ese modo el evento sirve también para elementos que se renderizan después.”

### 4. ¿Qué partes son asíncronas? ¿Qué pasaría si una respuesta llega tarde?
**Respuesta ideal:** “Las funciones de datos y los flujos que las consumen usan `async`/`await`; `Promise.all()` carga servicios y especialistas en paralelo. Los contadores de solicitud permiten descartar resultados de disponibilidad o retención que ya no corresponden a la selección actual. `try/catch/finally` maneja errores y restablece estados de interfaz. No hay WebSockets ni procesamiento en segundo plano.”

### 5. ¿Cómo evita reservar dos veces la misma hora?
**Respuesta ideal:** “En demo se detectan solapamientos entre reservas y retenciones en memoria para el mismo especialista y fecha. Pero eso solo protege esa instancia del navegador. En producción, el servidor debe revalidar disponibilidad y crear la retención atómicamente; el frontend no puede garantizar exclusión entre usuarios.”

### 6. ¿Qué información persiste y qué diferencia hay entre `sessionStorage` y `localStorage`?
**Respuesta ideal:** “Las cuentas demo y citas se guardan en `localStorage`; la sesión activa va en `sessionStorage`. La cuenta guarda un hash PBKDF2 con sal, no la contraseña en texto plano. El catálogo demo, retenciones y reservas para disponibilidad están en memoria. Nada de esto constituye una base central compartida.”

### 7. ¿La cuenta de administrador está protegida? ¿Qué cambiaría para producción?
**Respuesta ideal:** “No de forma segura: el código de invitación está en el HTML y la comprobación ocurre en el cliente; también se puede manipular el almacenamiento del navegador. En producción movería autenticación y autorización al backend, protegería cada endpoint por rol y guardaría contraseñas con hash seguro del lado servidor. El frontend solo mostraría la interfaz según la respuesta del servidor, sin ser la autoridad.”

### 8. ¿Cómo protege la aplicación lo que inserta en el HTML y qué limitaciones reconoce?
**Respuesta ideal:** “Escapo caracteres especiales antes de interpolar valores en `innerHTML` y uso `textContent` para contenido textual del perfil/comprobante, reduciendo riesgo de inyección en esos puntos. También hay validaciones HTML y validación de datos en JavaScript. No reemplaza validación del servidor. Además, el backend real no está incluido en este frontend; API, roles, historial y reportes siguen requiriendo trabajo de integración y seguridad.”

---

**Frase de cierre sugerida:** “El proyecto demuestra una separación modular entre interfaz, modelos, autenticación de demostración y acceso a datos. El flujo de reserva está implementado en frontend, con modo local y un contrato para API; para producción, la autoridad sobre identidad, permisos, disponibilidad y persistencia debe ser el backend.”
