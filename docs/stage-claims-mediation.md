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