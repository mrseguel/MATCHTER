// Fictional previews, separate from actual activity. Never sent to other users.
const examples=[
 ['like:example','MATCHPLAY','Nuevo Me gusta','A Carlos Muñoz le gustó tu video.','videos'],
 ['chat:example','Mensajes','Nuevo mensaje privado','Tienes un nuevo mensaje privado.','mensajes'],
 ['follow:example','MATCHPLAY','Nuevo seguidor','María Gómez comenzó a seguirte.','videos'],
 ['comment:example','MATCHPLAY','Nuevo comentario','María Gómez comentó tu video: ¡Excelente trabajo!','videos'],
 ['social-message:example','MATCHPLAY','Nuevo mensaje de MATCHPLAY','Carlos Muñoz te envió un mensaje desde MATCHPLAY.','social-inbox'],
 ['request:example','Solicitudes','Nueva solicitud privada','Has recibido una nueva solicitud privada.','solicitudes'],
 ['contract:example','Contratos','Contrato pendiente de firma','Recuerda que tienes un contrato pendiente de firma.','contratos'],
 ['quote:example','Cotizaciones','Nueva solicitud de cotización','Has recibido una solicitud de cotización.','cotizador'],
 ['employment:example','Empleos','Currículum preseleccionado','Una empresa ha preseleccionado tu currículum.','employment'],
 ['payment:example','Pagos','Pago pendiente','Tienes un hito de pago pendiente.','wallet'],
 ['claim:example','Reclamos','Actualización de reclamo','Hay novedades en tu reclamo.','seguridad'],
 ['system:example','Sistema','Información de tu cuenta','Conoce las novedades de MATCHTER.','perfil']
];
export function sampleNotices(actorId){
 if(!actorId)return [];
 return examples.map(([id,category,title,body,tab])=>({id:id+':'+actorId,category,title,body,tab,sample:true,preview:true,recipientId:String(actorId)}));
}
