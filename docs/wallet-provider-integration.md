# Wallet — separación entre pruebas y dinero real

El historial y los comprobantes leen los registros persistidos del contrato, sin crear cobros ni cambiar contratos anteriores. Los comprobantes son simulaciones, no boletas ni facturas; no se exponen por URL pública. El historial reciente tiene un límite de 100 contratos firmados por perfil.

## Próximo paso de integración financiera

Decisión aprobada el 27-11-2026: Khipu para transferencia bancaria y Mercado Pago para tarjeta de crédito o débito. Ambos deben integrarse en ambiente de pruebas antes de habilitar cobros. No se ha conectado un sandbox externo. El adaptador `paymentProviderSandbox.js` es una fixture en memoria exclusivamente para pruebas, no está expuesto en rutas HTTP y no representa una pasarela de pagos. No persiste instrumentos, no recibe datos bancarios, no cobra ni resguarda fondos.

Para la primera integración externa de pruebas, validar en ambos proveedores checkout alojado en CLP, identificación única de operaciones y consulta verificable de resultados. Verificar sus condiciones, costos, tratamiento de datos y productos de tokenización antes de habilitar guardado de medios de pago.

- No solicitar ni almacenar PAN completo, CVV, claves bancarias o credenciales del titular en MATCHTER. Usar checkout/inscripción del proveedor; solo conservar identificador tokenizado autorizado, marca y últimos dígitos permitidos si la integración lo soporta. Implementar desvinculación y consentimiento.
- Crear un intento persistido e idempotente por obligación de tarifa, identidad y revisión contractual; el importe proviene del contrato en el servidor, no del cliente. Una autorización, retorno del navegador o solicitud duplicada no acredita un cargo.
- Verificar autenticidad de eventos según documentación del proveedor y confirmar estado, moneda, importe y referencia por comunicación servidor a servidor. Conciliar, tratar intentos ambiguos, reversas, devoluciones y contracargos sin modificar el documento firmado.
- Mantener credenciales y tablas de pruebas separadas de producción; pruebas de concurrencia y de acceso. No transformar pagos simulados históricos en pagos reales ni cobrar dos veces.
- La modalidad directa solo requiere las tarifas propias de MATCHTER; los pagos de obra y de inspectores permanecen fuera. No activar custodia por disponer de una pasarela de cobro; requiere un producto específico, aprobación contractual, legal y operativa separada.

La selección visual aprobada es una vista de prueba: transferencia bancaria mediante Khipu o tarjeta de crédito/débito mediante Mercado Pago. Continuar registra solamente la simulación existente de la tarifa propia; no se registra un resultado atribuido a un proveedor. La vinculación de tarjetas y los checkouts externos requieren configuración comercial y técnica; no están habilitados. Los ingresos propios se dirigirán a una cuenta comercial separada; no se reciben fondos de obras ni honorarios de inspectores.

## Identidad y confianza en el checkout

Mostrar los recursos de marca del proveedor dentro de cada opción, en sus proporciones originales, con el nombre en texto y fallback visual. Recursos preliminares: [logos oficiales Khipu](https://docs.khipu.com/resources/payment-logos) y el isotipo de navegación del CDN de Mercado Pago (pendiente verificar descarga, vigencia y manual de marca antes de publicar). Preferir archivos locales autorizados antes de producción. Nota aprobada para el checkout: «El pago se realiza en la plataforma segura del proveedor seleccionado. MATCHTER no procesa directamente los pagos ni recibe tus datos bancarios». En beta se usa futuro y se explicita que no habrá cobro real. La nota no implica renuncia a obligaciones comerciales ni una garantía de ausencia de riesgos.
