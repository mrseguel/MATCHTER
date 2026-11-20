# MATCHTER · Prototipo funcional

Aplicación web de demostración para conectar clientes, maestros independientes, contratistas y empresas constructoras en Temuco, Chile.

## Qué incluye
- Panel de cliente con inicio, exploración tipo Tinder, filtros por especialidad, likes, favoritos, mensajes, servicios, reclamos, wallet, perfil y calificaciones.
- Panel de empresa con información pública/privada, estado de verificación y métricas de ejemplo.
- Perfiles profesionales, especialidades, reputación y portafolio demostrativo.
- API Node/Express separada de React.
- Capa `repository.js` que permite reemplazar datos de prueba por persistencia real.
- Esquema inicial Prisma/PostgreSQL en `server/prisma/schema.prisma`.

## Requisitos
Node.js 20+ y npm.

## Ejecutar localmente
```bash
npm install
cp server/.env.example server/.env
npm run dev
```
Frontend: http://localhost:5173  
API: http://localhost:4000/api/health

## Configurar conexión real
1. Crear una base PostgreSQL administrada.
2. Configurar `DATABASE_URL` en `server/.env`.
3. Instalar Prisma en el workspace server (`npm install prisma @prisma/client -w server`).
4. Ejecutar `npx prisma generate --schema server/prisma/schema.prisma`.
5. Crear migraciones revisadas (`npx prisma migrate dev --schema server/prisma/schema.prisma`).
6. Implementar `PrismaRepository` en `server/src/repository.js` y seleccionarlo por configuración. Las rutas HTTP no deberían consultar Prisma directamente.
7. Añadir autenticación, autorización por rol y validación de entrada antes de exponer la API.

## Endpoints disponibles
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/professionals?category=Electricidad&search=tablero`
- `GET /api/professionals/:id`
- `POST /api/interactions` `{ "professionalId":"p1", "type":"like" }`

## Datos de prueba
Los nombres, RUT, empresas, calificaciones, conversaciones y montos que aparecen en pantalla son ficticios y se usan exclusivamente para demostrar flujos. No representan profesionales reales ni verificaciones reales.

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
- Añadir pruebas unitarias/integración/e2e y pipeline CI/CD.

## Decisiones de alcance tomadas
La propuesta PDF define como núcleo del MVP perfiles, portafolios, búsqueda, match, comunicación, reputación vinculada a trabajos y administración básica. El pago protegido se deja como integración preparada para una etapa posterior, porque el documento condiciona su incorporación a proveedor habilitado y revisión legal/financiera.
