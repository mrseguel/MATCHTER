(function(){
const fs=require('node:fs'),update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)},once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,150));return s.replace(a,b)};
update('client/src/features/notifications/iconKind.js',s=>once(s,"if(key.startsWith('comment:')||/comentario/i.test(title))return 'message-circle';","if(key.startsWith('comment:')||key.startsWith('social-message:')||/comentario|mensaje/i.test(title))return 'message-circle';"));
update('client/src/App.jsx',s=>{
s='import {sampleNotices} from "./features/notifications/sampleNotices.js";\n'+s;
s=once(s,'const notices=collectNotifications({actorId:noticeOwner,requests,jobs,chats,applications:employment.applications,social:socialActivity})','const actualNotices=collectNotifications({actorId:noticeOwner,requests,jobs,chats,applications:employment.applications,social:socialActivity})\n  const notices=[...sampleNotices(noticeOwner),...actualNotices]');
return s;
});
update('client/src/features/notifications/NotificationCenter.jsx',s=>{
// Show examples without navigating to a nonexistent contract or conversation.
s=once(s,'onClick={()=>{onRead(n.id);onOpen(n)}}','onClick={()=>{onRead(n.id);if(!n.preview)onOpen(n)}}');
s=once(s,'{n.sample?\' · Ejemplo\':\'\'}','{n.sample?\' · Ejemplo\':\'\'}');
s=once(s,'<p className="mut nc-note">Vista previa: avisos de la actividad de esta sesión.','<p className="mut nc-note">Los avisos marcados «Ejemplo» son ficticios y permiten revisar el diseño. Al abrirlos se marcan como leídos, sin iniciar trámites ni conversaciones. Los demás avisos reflejan la actividad de esta sesión.');
return s;
});
console.log('BETA: 12 clearly labeled per-profile fictional notifications, previewing all approved icons in order; no fake actions or transactions.');
})();