# Activación controlada de pasarelas de prueba — MATCHTER

## Estado verificado
CI 46043435606 (commit 95c4bd18db6924c687dc06c33e350e8640bc184d): 226 pruebas aprobadas, 112 solicitudes HTTP autenticadas en QA, cero vulnerabilidades conocidas según npm audit runtime. Las pruebas de cobros y conciliación siguen usando respuestas ficticias. El 27-11-2026 se creó la cuenta de cobro Khipu en modo desarrollador mediante DemoBank; el titular guardó KHIPU_API_KEY como secreto de Preview en matchter-beta. No hay endpoints financieros habilitados ni cobros externos creados.

## Khipu: primer paso personal
- Portal de registro: https://khipu.com/user/register (si existe usuario, iniciar sesión).
- Perfil de usuario > Opciones de desarrollador > activar modo desarrollador.
- Configurar > Cuentas de cobro > Crear cuenta en modo desarrollador.
- Confirmar explícitamente que la cuenta de cobro es de desarrollo, que utiliza un banco de demostración y que no se rinde dinero real. No crear una cuenta comercial ni asociar una cuenta bancaria real para esta prueba.
- En Opciones de la cuenta > Para integrar Khipu a tu sitio web, localizar Id de cobrador y API key. No copiar claves al chat. No rotar claves existentes.
- Fuente oficial: https://docs.khipu.com/payment-solutions/instant-payments/description (sección Cuenta de cobro en modo desarrollador). Khipu usa infraestructura común para prueba y producción; el entorno no se demuestra por el hostname ni por un texto de configuración.

## Mercado Pago: segundo paso personal
- Panel de integraciones: https://www.mercadopago.cl/developers/panel/app.
- Iniciar sesión con la cuenta del titular. Crear aplicación MATCHTER QA para Chile, Checkout Pro con Preferences, que es el contrato preliminar implementado. Si la plataforma exige Orders u otro producto, no seleccionar una alternativa sin revisar compatibilidad y obtener aprobación cuando el cambio sea sustancial.
- Confirmar selector Prueba y vendedor de prueba generado automáticamente. Las credenciales de prueba pueden comenzar APP_USR: el prefijo no distingue ambientes.
- Crear cuenta compradora de prueba de Chile cuando sea necesario para el flujo de Preferences. No utilizar tarjetas reales, saldos reales ni aceptar costos.
- Documentación: https://www.mercadopago.cl/developers/es/docs/checkout-pro-preferences/create-application y https://www.mercadopago.cl/developers/es/docs/checkout-pro-preferences/test-accounts.

## Configuración y validación externa pendiente
Entorno separado de producción y del alias estable de autenticación. La futura configuración del servidor usará identificadores de comercio y secretos de API/notificación exclusivos de prueba; nunca frontend, GitHub, logs, capturas ni chat. No habilitar llamadas externas al marcar una etiqueta sandbox: verificar cuenta y modo reales, y confirmar los requisitos de firma y callback con cada proveedor. Antes de introducir secretos, comprobar aislamiento de proyecto/entorno, origen HTTPS, base QA, ausencia de acceso público a creación de pagos, y capacidad de revocación. No configurar URLs de notificación hasta tener el receptor externo aislado y validado.

## Secuencia de validación externa
1. Confirmar ambos paneles y entorno sin dinero real.
2. Comprobar la configuración del entorno QA aislado y acordar almacenamiento seguro de secretos (el titular introduce claves directamente en el almacén; no se transmiten por chat).
3. Validar contrato API oficial y autenticación del comercio de prueba sin crear un cobro real. Revisar discrepancias entre guías y especificación vigente.
4. Crear una sola orden de prueba por obligación, con referencia persistente, ejecutar únicamente medios ficticios, comprobar confirmaciones y rechazos, pérdida de conexión, notificaciones duplicadas y recuperación.
5. Presentar cualquier cambio necesario al selector, textos o navegación al titular antes de aplicarlo. No tocar producción hasta autorización expresa.

No se encontró un conector directo para administrar estas cuentas desde la sesión actual. La autenticación personal en el portal y la incorporación segura de secretos son intervenciones inevitables del titular. El resto de las tareas técnicas se mantiene autónomo.

## Evidencia de conectividad Khipu — 27-11-2026
- Despliegue de diagnóstico Preview: `dpl_EwaoHCoXvchDPyvsLLP1uURQJema` (READY, target null, alias vacío). Código exacto: `ddffcdad97024cbc7ebd299754b08a49c6351092`, `scripts/khipu-sandbox-probe.mjs`.
- Log: `KHIPU_PROBE_SELF_TEST_OK 13` y `KHIPU_PROBE_RESULT {"status":"demo_banks_only","operation":"GET /v3/banks","realPayment":false,"authenticated":true,"bankCount":1}`. Consulta autenticada al endpoint oficial, sin POST, sin base de datos y sin publicar secretos ni detalles bancarios. La detección por nombre de banco es evidencia complementaria de la cuenta de desarrollo confirmada por el titular; no demuestra por sí sola identidad de cobrador ni constituye prueba de conciliación.
- Especificación: https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getbanks ; creación: https://docs.khipu.com/apis/v3/instant-payments/openapi/other/postpayment ; consulta: https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getpaymentbyid .
- Antes de crear el primer cobro: habilitar únicamente Khipu, volver a verificar bancos de prueba, fijar banco de demostración y monto contractual, usar una reserva persistente en una base QA aislada con actores sintéticos, impedir reintentos ambiguos, comprobar `receiver_id` y referencia, y mantener notificaciones externas deshabilitadas hasta validar su configuración. No reutilizar el contrato de prueba ya pagado.
