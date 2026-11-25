# Matchter — fase de identidad (sin rutas activadas)
- Branch Neon: matchter-integracion (br-withered-sound-b6monlav). No producción.
- Neon Auth administrado es la opción preferida, pendiente de habilitar en Console.
- Antes de montar rutas: confirmar issuer, audience, JWKS y claim email_verified con tokens reales del proveedor. Usar sólo los algoritmos realmente publicados.
- Mantener las rutas demo separadas. No enviar contraseñas al backend de Matchter; el proveedor administra registro, verificación, sesiones y recuperación.
- Crear una credencial PostgreSQL separada con privilegios mínimos SELECT/INSERT sobre matchter.accounts; no usar matchter_probe ni el propietario. Revisar aislamiento y límites de solicitudes.
- Conectar la API protegida a la interfaz sólo después de comprobar sesión, cierre, expiración, verificación de correo, autorización e identidad entre dos usuarios. No tratar un tipo de perfil como una verificación profesional o de empresa.
- Esta etapa no habilita registros reales, no cambia el alias público y no configura un proveedor de identidad.
