# Wallet — separación entre pruebas y dinero real

El historial y los comprobantes leen los registros persistidos del contrato, sin crear cobros ni cambiar contratos anteriores. Los comprobantes son simulaciones, no boletas ni facturas; no se exponen por URL pública. El historial reciente tiene un límite de 100 contratos firmados por perfil.

## Próximo paso de integración financiera

No se ha elegido un proveedor ni se ha conectado un sandbox externo. El adaptador `paymentProviderSandbox.js` es una fixture en memoria exclusivamente para pruebas, no está expuesto en rutas HTTP y no representa una pasarela de pagos. No persiste instrumentos, no recibe datos bancarios, no cobra ni resguarda fondos.

Para la primera integración real de pruebas, seleccionar un proveedor disponible para comercios en Chile que acepte CLP y que ofrezca un entorno de pruebas, checkout alojado, identificación única de operaciones y consulta verificable de resultados. Verificar sus condiciones, costos, tratamiento de datos y productos de tokenización antes de habilitar guardado de medios de pago.

- No solicitar ni almacenar PAN completo, CVV, claves bancarias o credenciales del titular en MATCHTER. Usar checkout/inscripción del proveedor; solo conservar identificador tokenizado autorizado, marca y últimos dígitos permitidos si la integración lo soporta. Implementar desvinculación y consentimiento.
- Crear un intento persistido e idempotente por obligación de tarifa, identidad y revisión contractual; el importe proviene del contrato en el servidor, no del cliente. Una autorización, retorno del navegador o solicitud duplicada no acredita un cargo.
- Verificar autenticidad de eventos según documentación del proveedor y confirmar estado, moneda, importe y referencia por comunicación servidor a servidor. Conciliar, tratar intentos ambiguos, reversas, devoluciones y contracargos sin modificar el documento firmado.
- Mantener credenciales y tablas de pruebas separadas de producción; pruebas de concurrencia y de acceso. No transformar pagos simulados históricos en pagos reales ni cobrar dos veces.
- La modalidad directa solo requiere las tarifas propias de MATCHTER; los pagos de obra y de inspectores permanecen fuera. No activar custodia por disponer de una pasarela de cobro; requiere un producto específico, aprobación contractual, legal y operativa separada.

La UI real de medios de pago y un primer checkout externo de pruebas requieren selección y configuración del proveedor; no están habilitados.
