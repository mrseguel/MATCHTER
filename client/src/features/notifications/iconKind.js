export function notificationIcon(n){
 const key=String(n?.id||''),title=String(n?.title||'');
 if(n?.category==='MATCHPLAY'){
  if(key.startsWith('like:')||/me gusta|like/i.test(title))return 'heart';
  if(key.startsWith('follow:')||/seguidor|seguir/i.test(title))return 'user-plus';
  if(key.startsWith('comment:')||/comentario/i.test(title))return 'message-circle';
  return 'play';
 }
 return ({Solicitudes:'handshake',Mensajes:'message-circle',Interacciones:'heart',Contratos:'file-pen',Cotizaciones:'calculator',Empleos:'briefcase',Pagos:'wallet',Reclamos:'shield-alert',Sistema:'shield-check'})[n?.category]||'bell';
}
