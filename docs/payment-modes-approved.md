# Modalidades de pago MATCHTER — decisión 26-11-2026

Modo directo (sin custodia verificada): cliente y prestador pagan cada uno su tarifa base de CLP 2.990. El total contractual y las etapas son informativos; los pagos de la obra se realizan directamente entre las partes. No registrar depósitos, saldos protegidos ni liberaciones de dinero de la obra. No prometer descuento automático del prestador en dinero que la plataforma no recibe.

Modo protegido (futuro, solo cuando exista integración financiera autorizada y operativa): la primera etapa del cliente incluye su tarifa base una sola vez; las siguientes no incluyen una nueva tarifa base. El prestador paga únicamente su tarifa o autoriza descontarla del primer desembolso apto, sin confundir autorización con cobro. Ejemplo: primera etapa CLP 100.000 + CLP 2.990 = CLP 102.990. Nunca activar por decisión de interfaz; validar configuración en servidor y persistir modalidad por contrato.

Conservar cuentas, firmas, tarifas confirmadas, versiones anteriores y diseño. No reiniciar ni reinterpretar un contrato histórico. Antes de activar el modo directo para contratos de prueba existentes con descuento autorizado, definir cómo regularizar la tarifa sin cobrar dos veces ni invalidar la firma; no declarar la tarifa pagada por autorización. No modificar datos existentes hasta definir transición explícita.

Integración pendiente: conectar la política a serviceFeeDemo, projectContractDemo, projectStageDemo, projectWorkflow y vistas RealContractDemo/RealStageDemo/RealMessages, incluyendo estados y eventos históricos; bloquear rutas de custodia en modo directo y separar recepción conforme de la liberación financiera. En modo protegido, el primer pago y su tarifa requieren confirmación real del proveedor, idempotencia y conciliación; no usar la simulación como evidencia de fondos. Mantener avisos recíprocos y privacidad de condiciones comerciales. Las pruebas de esta rama cubren solo la planificación pura; todavía no habilitan ninguna modalidad en producción.

## Control exclusivo del administrador

Panel de administración → Pagos → Modalidad de pagos. Opciones: Sin resguardo de fondos / Con resguardo de fondos. Predeterminado sin resguardo, incluso si existe integración; activación explícita por el administrador. El servidor debe comprobar el permiso administrativo, verificar la integración, persistir y auditar la selección. Aplicar únicamente a nuevos contratos, conservando condiciones de los existentes.

Sin resguardo: cuadro independiente «Tarifa por servicio MATCHTER», $2.990, botón «Pagar tarifa por servicio». Otro cuadro independiente «Resumen del proyecto» con valor total y desglose de etapas, claramente informativo. Sin sumar montos al cobro MATCHTER ni simular custodia.

Con resguardo: cuadro de pago del cliente con valor contractual informativo, monto de primera etapa, tarifa de $2.990 y total a pagar ahora en una sola operación. Si existe una sola etapa, incluye todo el valor de los trabajos. Las demás etapas se pagan según contrato. Prestador: únicamente su propia tarifa de $2.990, mediante pago directo o autorización de descuento al liberar el primer pago suficiente. Evitar doble cobro. Mantener avisos bilaterales automáticos y privacidad de condiciones comerciales.

Se añadió un componente controlado de configuración administrativa y validación aislada del servidor. Faltan autenticación administrativa real, persistencia, auditoría, conexión de vistas y pruebas integrales. El panel de demostración existente no autoriza operaciones financieras.
