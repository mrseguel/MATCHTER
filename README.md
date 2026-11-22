# MATCHTER · Demo visual

Demo de MATCHTER construida sobre el diseño de `MATCHTER-visual.zip` y la arquitectura cliente/API del repositorio.

## Qué incluye
- Cuatro perfiles diferenciados para recorrer: Cliente, Maestro o contratista, Profesional y Empresa.
- Explorar y filtrar perfiles, guardar favoritos, enviar likes y abrir detalles/portafolios.
- Crear proyectos públicos, explorar encargos y expresar interés.
- Enviar solicitudes privadas. La aceptación confirmada por la API crea el Match; trabajo y chat se simulan en la sesión.
- Matches, mensajería con respuestas automáticas, contratos, hitos, wallet, reclamos y administración.
- API Node/Express con `MockRepository`; los esquemas Beta de Prisma están preparados, sin conexión ni migración a Neon.

## Requisitos
Node.js 20+ y npm.

## Ejecutar localmente
```bash
npm install
npm run dev
```
Frontend: http://localhost:5173  
API: http://localhost:4000/api/health

El cliente mantiene proyectos, solicitudes, Matches, trabajos y chats en memoria de React durante la sesión; al recargar la página, el cliente no rehidrata esos datos desde la API. `MockRepository` conserva proyectos, solicitudes, Matches e interacciones únicamente mientras vive el proceso Node; al reiniciarlo vuelve a los valores de demo. La API registra el Match al aceptar; el trabajo y el chat que aparecen en pantalla son simulaciones locales de la sesión y no se guardan en el servidor.

## Endpoints demo
- `GET /api/health` y `GET /api/dashboard`
- `GET /api/professionals`, `GET /api/professionals/:id`
- `POST /api/interactions`
- `GET /api/projects`, `POST /api/projects`
- `GET /api/requests?participantId=<id>` (también acepta `clientUserId` o `recipientId` como filtros explícitos)
- `POST /api/requests`, `PATCH /api/requests/:id`

Las solicitudes privadas comienzan en estado pendiente. La interfaz solo confirma envío, aceptación o rechazo cuando la API responde correctamente; si falla, conserva el estado previo y muestra el error. El endpoint de respuesta coteja el perfil demo declarado con el destinatario, pero esos identificadores no son credenciales y todavía no hay autenticación real.

## Pruebas
- `npm run test -w client`: reglas de construcción de solicitudes, roles destinatarios, resolución de aceptación/rechazo y deduplicación.
- `npm run test -w server`: reglas de persistencia en memoria, validación del propietario, permisos, aceptación, rechazo y duplicados.

La demo no tiene autenticación ni pruebas de navegador end-to-end. En un despliegue estático sin el servidor `/api`, las operaciones requieren un backend disponible y mostrarán error si no responde. La API valida la identidad declarada del perfil de demostración; esa comprobación no reemplaza autenticación/autorización real para Beta.

## Datos de prueba
Los nombres, fotos externas, empresas, calificaciones, conversaciones, estados de verificación y montos son ficticios. Wallet, firma/aceptación de acuerdos, evidencia, mediación y pagos solo actualizan estado de demostración: no transfieren dinero, suben archivos ni crean contratos legales.

## Antes de producción: imprescindible
Este repositorio es un prototipo, no un sistema listo para recibir datos reales o pagos.
- Implementar autenticación segura (hash Argon2id/bcrypt, sesiones/JWT con rotación, recuperación MFA según riesgo) y autorización RBAC por recurso.
- Validar y normalizar entradas; rate limiting, protección CSRF donde corresponda, logs de auditoría, backups, monitoreo y gestión de secretos.
- Separar datos públicos y privados en la API; no confiar en ocultarlos solo desde la interfaz.
- Implementar consentimiento, política de privacidad, retención/borrado, cifrado en tránsito y en reposo y revisión legal chilena de datos personales.
- Verificación de identidad/empresa mediante proveedor y revisión humana; el tic azul debe depender de evidencia auditada, no de un booleano editable por el usuario.
- Integrar chat en tiempo real, almacenamiento seguro de imágenes y moderación de portafolios.
- Reseñas solo después de contratos verificables; reglas de denuncia y apelación.
- El pago condicionado debe ser provisto por un proveedor habilitado y una estructura legal/financiera revisada. No custodiar fondos directamente ni prometer escrow propio. En la wallet solo guardar tokens del proveedor y marca/últimos cuatro dígitos; nunca PAN ni CVV.
- Definir contratos, alcance, materiales incluidos/excluidos, hitos, aceptación, plazos, cambios, cancelaciones y resolución de controversias.
- Ampliar pruebas de integración/e2e y pipeline CI/CD.

## Evolución a Beta
La capa de repositorio y el esquema Prisma contemplan proyectos, solicitudes privadas, matches e interacciones. Para Beta se debe implementar autenticación y autorización real, persistencia PostgreSQL/Neon, migraciones revisadas, chat y almacenamiento, y un proveedor de pagos habilitado. Ninguna base Neon se conecta ni migra desde esta demo.
