const id=v=>String(v??'');
const same=(a,b)=>id(a)!==''&&id(a)===id(b);
export const categories=['Solicitudes','Mensajes','Interacciones','MATCHPLAY','Contratos','Cotizaciones','Empleos','Pagos','Reclamos','Sistema'];
export function collectNotifications({actorId,requests=[],jobs=[],chats={},applications=[],social={},system=[]}){
 const me=id(actorId),out=[];if(!me)return out;
 const add=(key,category,title,body,tab,details={})=>out.push({id:key,category,title,body,tab,...details});
 for(const r of requests){if(same(r.recipientId,me)&&r.status==='pending')add('request:'+r.id,'Solicitudes','Nueva solicitud privada',(r.senderName||'Un usuario')+' · '+(r.projectTitle||'Proyecto'),'solicitudes');if(same(r.senderId,me)&&['accepted','rejected'].includes(r.status))add('request:'+r.id+':'+r.status,'Solicitudes',r.status==='accepted'?'Solicitud aceptada · Nuevo Match':'Solicitud no aceptada',r.projectTitle||'Solicitud privada','solicitudes');}
 for(const j of jobs){if(!same(j.clientId,me)&&!same(j.providerId,me))continue;
 if(!j.demoSeed)add('contract:'+j.id,'Contratos','Nuevo contrato',j.project||'Proyecto','contratos');
 if(!j.signed)add('sign:'+j.id,'Contratos','Contrato pendiente de firma',j.project||'Proyecto','contratos',{reminder:true});
 if(j.signed&&!j.notarized)add('notary:'+j.id,'Contratos','Certificación pendiente',j.project||'Proyecto','contratos',{reminder:true});
 if(j.notarized&&Number(j.paid||0)<3)add('payment:'+j.id+':'+j.paid,'Pagos','Hito de pago pendiente',j.project||'Proyecto','wallet',{reminder:true});
 (chats[j.id]||[]).forEach((m,i)=>{const recipient=m.recipientId??(j.demoSeed&&!m.me?j.clientId:null);if(same(recipient,me))add('chat:'+j.id+':'+i,'Mensajes','Nuevo mensaje',String(m.t||'').slice(0,120),'mensajes',{sample:!m.recipientId||!!m.sample});});
 }
 for(const a of applications){if(same(a.companyId,me))add('apply:'+a.id,'Empleos','Nueva postulación laboral',a.cv?.name||'Postulante','employment',{initial:'applications'});if(same(a.workerId,me)){if(a.status!=='Enviada'&&a.status!=='Pendiente')add('apply:'+a.id+':'+a.status,'Empleos','Estado de tu postulación',a.status||'En revisión','employment',{initial:'applications'});for(const [type,d] of Object.entries(a.documents||{}))if(d.status==='Solicitado')add('doc:'+a.id+':'+type,'Empleos','Documentación solicitada',type==='identity'?'Cédula de identidad':'Certificado de antecedentes','employment',{initial:'applications'});}}
 const {posts=[],follows={},threads={},people=[]}=social;const name=x=>people.find(p=>same(p.id,x))?.name||'Un usuario';
 for(const [from,ids] of Object.entries(follows))if(!same(from,me)&&ids.some(x=>same(x,me)))add('follow:'+from,'MATCHPLAY','Nuevo seguidor',name(from)+' sigue tu perfil','videos');
 for(const p of posts){if(!same(p.author,me))continue;for(const from of p.likes||[])if(!same(from,me))add('like:'+p.id+':'+from,'MATCHPLAY','Nuevo Me gusta',name(from)+' · '+(p.caption||'Video'),'videos');for(const c of p.comments||[])if(!same(c.author,me))add('comment:'+c.id,'MATCHPLAY','Nuevo comentario',name(c.author)+' · '+c.body,'videos');}
 for(const [key,t] of Object.entries(threads)){if(!t.participants?.some(x=>same(x,me)))continue;for(const m of t.messages||[])if(!same(m.from,me))add('social-message:'+key+':'+m.id,/cotizaci[oó]n|presupuesto/i.test(m.body)?'Cotizaciones':'Mensajes',/cotizaci[oó]n|presupuesto/i.test(m.body)?'Consulta de cotización · MATCHPLAY':'Mensaje de MATCHPLAY',name(m.from)+' · '+String(m.body).slice(0,100),'social-inbox');}
 return [...system.filter(n=>same(n.recipientId,me)),...out].reverse();
}
