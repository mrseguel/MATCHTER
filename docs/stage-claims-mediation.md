# Reclamos y mediación vinculados a proyectos y etapas

## Acceso
- Centro de Reclamos y mediación: listar proyectos contratados con contraparte, contrato, etapa actual, fechas, avance, montos informativos y reclamos existentes.
- Desde el seguimiento de obra en el chat: acceso discreto «Presentar reclamo», abre el mismo expediente con proyecto y etapa preseleccionados, no un segundo sistema.
- Cliente y prestador pueden presentar un reclamo sobre su propio contrato en ejecución. Permitir seleccionar la etapa afectada, no necesariamente la actual. La elegibilidad posterior al cierre debe respetar la política de garantías y el acceso a autoridades; no prometer mediación indefinida.

## Expediente
- Identificador único; fecha y hora del servidor; perfil que presenta; contraparte; proyecto; versión del acuerdo y revisión/digest del contrato; etapa afectada y snapshot del estado a la fecha (no sobrescribir el histórico al avanzar).
- Motivo (calidad/alcance, retraso, incumplimiento, desacuerdo de pago, comunicación, otro), descripción, solución solicitada; cláusulas relevantes opcionales; fotos/documentos y respuestas vinculadas.
- El servidor recupera datos contractuales y de etapa de fuentes autorizadas. No aceptar montos, identidad, estado de obra ni cláusulas verificadas desde el cliente como hechos comprobados.
- Evidencia privada en almacenamiento autorizado: tamaño/tipo verificado, escaneo, autorización por caso, nombres saneados, enlaces temporales, registro de acceso y política de retención. No guardar imágenes en el chat ni aceptar URLs públicas arbitrarias. No simular una carga completada.

## Tramitación
- Recibido → revisión inicial → invitación a mediación → mediación en curso → acuerdo registrado / sin acuerdo / desistimiento. No declarar aceptación de ambas partes sin confirmaciones individuales; conservar eventos y resoluciones.
- Mostrar ambas perspectivas con oportunidad de aportar antecedentes. Notificaciones de estado en el chat sin publicar fotos, documentos sensibles ni detalles del expediente. Administrador/mediador con acceso autorizado y trazable.
- La mediación es voluntaria, no sustituye denuncia ante autoridad, acción judicial ni garantía. No afirmar que MATCHTER certifica hechos, decide responsabilidad legal o garantiza reparación.
- Sin resguardo: reclamo y seguimiento sin operaciones financieras. Con resguardo: eventual retención/liberación solo por regla contractual y proveedor financiero autorizado, con revisión y trazabilidad; abrir un reclamo no mueve dinero ni congela automáticamente fondos externos.
- No cancelar contrato, cambiar avances o cerrar una etapa automáticamente por la presentación de un reclamo. La política de avance mientras hay controversia debe acordarse antes de activar.

## Alcance de esta rama
Diseño técnico inicial, no módulo publicado. Conectar API autenticada, persistencia, almacenamiento privado de archivos, pantalla central y acceso contextual; integrar mediación administrativa real y pruebas de ambas modalidades. Mantener la beta vigente y datos existentes intactos.

## Mediación según modalidad financiera (aclaración del producto)

- En ambas modalidades, la mediación es un servicio complementario incluido en la tarifa de gestión contractual vigente (ejemplo maestro/contratista: CLP 2.990 por parte), sin nueva tarifa de mediación propuesta. Ambas partes tienen acceso equitativo a presentar antecedentes, responder y aceptar o rechazar propuestas de acuerdo.
- Sin resguardo: facilitación voluntaria de acuerdos y expediente documental. MATCHTER no retiene, exige, transfiere ni libera importes de obra; la recepción de un reclamo no implica deuda verificada ni sanción. Las partes mantienen sus acciones externas.
- Con resguardo: la protección económica se concibe como salvaguarda neutral, no como sanción o mecanismo de coacción. Una controversia sobre una etapa podría dar lugar a una solicitud de suspensión temporal de la liberación de la suma disputada, únicamente si el contrato, la regulación aplicable y el proveedor financiero autorizado lo permiten. No inmovilizar automáticamente otras etapas ni fondos ajenos a la controversia. No permitir al mediador apropiarse, devolver o liberar fondos a discreción.
- Antes de activar esta función: revisión jurídica chilena y acuerdo con proveedor financiero sobre condiciones objetivas, aviso y oportunidad de respuesta, alcance, plazo máximo, revisión, gestión de mala fe, fondos no controvertidos y salida en caso de ausencia de acuerdo. Una resolución económica exige la base contractual y jurídica aplicable y confirmación del proveedor (por ejemplo acuerdo de ambas partes u orden competente); un reclamo o una propuesta unilateral no basta.
- Ambas modalidades deben permitir exportar un expediente de antecedentes accesibles para cada parte, con contrato y versiones, acuerdos, comunicaciones pertinentes, avance, fechas, archivos autorizados, respuestas, propuestas y resultado; distinguir alegaciones de hechos comprobados, preservar integridad y trazabilidad, respetar privacidad y retención. No prometer valor probatorio concluyente ni certificación legal. Mantener vías ante autoridades y tribunales cuando correspondan, sin exigir mediación previa.
- Estado: requisito documentado, pendiente implementación y validación legal/financiera. No activar bloqueo de fondos real ni modificar los contratos previos. La política de suspensión de hitos físicos sigue pendiente de definición.


## Propuesta de inspección técnica independiente (pendiente de aprobación definitiva)

- Sin resguardo: mediación voluntaria de buena fe y expediente exportable; si no hay acuerdo, registrar cierre sin acuerdo y conservar las vías externas. No ordenar pagos, imponer reparaciones ni obligar a contratar inspecciones.
- Con resguardo: si la mediación ordinaria no resuelve una controversia técnica relevante (defectos, abandono, avance discutido o costo de completar/reparar), ofrecer escalamiento a una inspección técnica presencial independiente. Profesional verificado, competencia pertinente a la especialidad, declaración de conflictos de interés, sin relación con las partes, honorario fijo no condicionado al resultado. El inspector no debe obtener el encargo de reparación derivado de su propio informe.
- Selección neutral con posibilidad de objetar conflictos; cotización y autorización expresa del servicio, alcance, plazo y responsable del costo antes de contratar. No cargar el costo automáticamente a fondos en disputa. El reparto definitivo del costo requiere fundamento válido; prever casos de bajo monto, falta de profesionales y negativa de acceso.
- Informe firmado y fechado, vinculado a expediente y versión del contrato: alcance y limitaciones, visita y metodología, partidas y cantidades, avance ejecutado aprovechable, hallazgos y evidencia, exigencias técnicas aplicables, causas cuando determinables, alternativas de subsanación, presupuesto desglosado de reparación o terminación (mano de obra, materiales, impuestos y supuestos), incertidumbre y anexos. Distinguir defecto atribuible, cambio de alcance, obra pendiente y daños no comprobados; evitar doble conteo del saldo contractual y costo de reemplazo.
- Entregar informe a ambas partes, permitir observaciones y subsanación cuando proceda; segunda revisión independiente si existen errores o discrepancias relevantes. El informe es una base técnica para una propuesta de liquidación o acuerdo, no un fallo ni una orden de transferencia.
- Toda suspensión, devolución, pago a prestador o utilización de fondos para completar/reparar debe estar respaldada por mecanismo contractual y jurídico válido, con oportunidad de respuesta y confirmación del proveedor financiero. Liberar importes no controvertidos cuando corresponda. Sin acuerdo ni otra autorización válida, acudir al mecanismo externo competente; no convertir a MATCHTER ni al inspector en árbitro unilateral. No garantizar indemnidad jurídica ni suficiencia del saldo resguardado.
- Posible categoría de servicio para perfiles profesionales: «Inspección técnica y evaluación de controversias». Separar esa prestación adicional cotizada del servicio básico de mediación incluido en la tarifa MATCHTER. La inspección como escalamiento de la mediación se reserva al modo protegido, sin impedir que las partes contraten asesoría independiente fuera del procedimiento directo.
- Estado: propuesta conceptual documentada, sin cambios de código, tarifas, base de datos, beta o manejo financiero; pendiente revisión de usuario, abogado chileno y entidad financiera autorizada.
