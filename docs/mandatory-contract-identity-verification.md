# MATCHTER — Requisito obligatorio de identidad y formalización contractual
Decisión de producto del 25-11-2026. Complementa la eliminación de la modalidad sin contrato escrito.

## Reglas de negocio
- Solo se admiten dos modalidades: contrato escrito con firma electrónica simple (gratuito para los usuarios) y contrato escrito con autorización notarial de firmas (servicio con costo informado y aceptado previamente).
- En ambas modalidades, cliente y prestador (maestro, contratista, profesional o representante autorizado de empresa) deben completar individualmente la verificación obligatoria de identidad antes de firmar.
- Captura guiada de anverso y reverso de cédula vigente, legibles y completos; además, evidencia de rostro de la persona sosteniendo el anverso junto a su cara, de cerca, con buena iluminación y sin reflejos. Si la captura conjunta no permite leer el documento, solicitar una toma separada del anverso. El método definitivo deberá cumplir requisitos de necesidad, proporcionalidad, seguridad y accesibilidad; contemplar revisión segura ante fallos.
- Una fotografía por sí sola no acredita autenticidad: validar vigencia/autenticidad por medios autorizados, comprobar correspondencia con el titular y, cuando proceda, prueba de vida. No marcar como verificado por el solo hecho de adjuntar imágenes.
- Para empresas verificar también facultades del representante.
- Ambas partes firman la misma versión inmutable del documento. No habilitar pago protegido sin contrato firmado por ambas partes y, en modalidad notarial, constancia efectiva de autorización notarial.
- ClaveÚnica puede formar parte de un flujo autorizado de identificación, pero no equivale por sí sola a firma electrónica avanzada ni a autorización notarial. Nunca solicitar contraseña de ClaveÚnica; usar integración oficial o proveedor habilitado. Confirmar viabilidad de la actuación notarial remota con el proveedor y asesoría jurídica.
- Mostrar precio total del servicio notarial antes de comprometer el pago, sin cargos ocultos. Tarifa concreta, quién paga y política de cancelación/devolución quedan pendientes de definición. La modalidad simple no tiene cargo por formalización; no confundir con futuras comisiones transparentes por otros servicios.

## Seguridad y privacidad (requisitos de salida a producción)
- Informar finalidad, base jurídica, destinatarios, conservación y derechos; revisar Ley 19.628, Ley 21.719 y normativa vigente al lanzamiento. Evaluar especialmente el tratamiento biométrico y necesidad de la captura conjunta; definir alternativa segura si corresponde.
- Preferir proveedor especializado que procese evidencia de identidad y devuelva estado y referencia verificable. Cifrado, acceso mínimo, registros de acceso, plazos de retención y borrado; no almacenar fotos en chat, perfil público ni PDF contractual, ni compartirlas con contraparte. Separar evidencias sensibles del expediente ordinario.
- El servidor valida la identidad verificada y su asociación al firmante, versión contractual, confirmación de cada firma y autorización notarial cuando proceda. No confiar en una bandera enviada por el navegador.
- La beta actual continúa con datos ficticios, sin subir cédulas reales, sin selfies reales, sin biometría, sin firmas legalmente operativas ni cobros. Los botones de identidad demo no constituyen verificación. Implementación real bloqueada hasta completar selección de proveedor, arquitectura de privacidad y revisión legal.
