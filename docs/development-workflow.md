# MATCHTER — Directriz de continuidad del desarrollo

Aprobada por el titular del proyecto el 27-11-2026.

- Avanzar directamente a la siguiente tarea técnica comprendida en el alcance aprobado, sin solicitar confirmación al cerrar cada paso.
- Realizar correcciones, pruebas, optimizaciones y documentación de manera autónoma, manteniendo la integridad de datos, contratos, seguridad, interfaces y decisiones previamente aprobadas.
- Comunicar avances concretos, resultados y bloqueos. Diferenciar código implementado, validación de pruebas, conexión externa y despliegue efectivo.
- Solicitar autorización expresa cuando se requiera intervención o acceso personal, credenciales, costos, cambios de arquitectura o integración sustanciales, modificación significativa de diseño o reglas de negocio, cambios de producción o riesgos financieros y de seguridad.
- Mantener pruebas aisladas, no activar pagos reales ni alterar producción sin aprobación. No solicitar secretos por chat ni guardarlos en GitHub.
- Mantener el criterio de diseño de docs/ux-design-principles.md.
- La continuidad es dentro de una sesión de trabajo activa y las herramientas disponibles; no prometer ejecución en segundo plano sin configurar una tarea autorizada.

Si un módulo está bloqueado por una dependencia externa, identificar tareas independientes seguras que puedan adelantarse y explicar qué intervención es indispensable para resolver el bloqueo.

## Supervisión por etapas — precisión del titular

Completar cada etapa técnica aprobada de principio a fin, con correcciones y validaciones, sin pausas de autorización intermedias. Al finalizar, iniciar inmediatamente la siguiente etapa dentro del alcance autorizado, comunicar su objetivo y realizar sus primeros avances. Presentar entonces un punto de revisión para que el titular, que sigue activamente el desarrollo, pueda indicar continuidad, ajustes o retorno a una etapa anterior. Si requiere acceso personal, autorización de riesgo, costo o cambio sustancial, detenerse antes de ejecutar esa acción. Las tareas internas rutinarias de GitHub, Vercel y Neon no requieren aprobación individual; se mantienen los límites sobre producción, secretos, dinero real y datos existentes.

## Resolución autónoma de incidencias de infraestructura

Ante errores, incompatibilidades, bloqueos de CI, despliegues o límites de GitHub, Vercel y Neon, investigar registros y documentación oficial, identificar causa y alternativas, implementar correcciones reversibles dentro del alcance aprobado, ejecutar pruebas y continuar. Si la primera solución falla, investigar otras rutas compatibles y seguras. No trasladar al titular tareas que las herramientas autorizadas permiten resolver directamente. Respetar cuotas, permisos y políticas del servicio: no eludir restricciones de acceso, facturación o seguridad; no cambiar producción, eliminar datos, aceptar costos ni solicitar secretos por chat sin la autorización correspondiente. Si una restricción real requiere intervención del titular o ninguna alternativa segura resulta viable, explicar qué se intentó, qué queda bloqueado y qué acción concreta es indispensable, adelantando el trabajo independiente cuando sea posible.

## Aprobación de interfaces y navegación

El titular debe revisar las propuestas de diseño antes de cambiar las interfaces aprobadas, incluyendo orden, ubicación y jerarquía de botones, navegación, distribución de información, controles, textos y estructura de módulos. Presentar una comparación visual o prototipo cuando sea útil, con el motivo de la propuesta y referencias pertinentes según docs/ux-design-principles.md. Esperar su conformidad antes de aplicar el cambio visual propuesto; no confundir esta revisión con las tareas técnicas internas, que continúan autónomamente. Las correcciones que restauran fielmente el diseño ya aprobado (por ejemplo, un botón cortado o un error de navegación) pueden ejecutarse sin nueva aprobación, informando el resultado.
