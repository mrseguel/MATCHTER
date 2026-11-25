(function(){
 const fs=require('node:fs'),update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)},once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Expected anchor: '+a.slice(0,100));return s.replace(a,b)};
 update('client/src/approved/visual.js',s=>{const prev=s;s=s.replace(/(>[^<>]*?)(Más información|Más info)(?=\s*<)/gi,'$1Ver perfil completo');if(s===prev){if(!s.includes('Ver perfil completo'))throw Error('Profile caption not found');}return s});
 update('client/src/App.jsx',s=>{
 s='import {NotificationBell,NotificationCenter} from "./features/notifications/NotificationCenter.jsx";\nimport {collectNotifications} from "./features/notifications/model.js";\n'+s;
 s=once(s,'const [appearance,setAppearance]=useAppearance()','const [appearance,setAppearance]=useAppearance()\n  const [socialActivity,setSocialActivity]=useState({})\n  const [noticeRead,setNoticeRead]=useState({})');
 s=once(s,"const ownProfile=role==='Cliente'?activeClient:roleProfile","const ownProfile=role==='Cliente'?activeClient:roleProfile\n  const noticeOwner=String(ownProfile?.id||'')\n  const notices=collectNotifications({actorId:noticeOwner,requests,jobs,chats,applications:employment.applications,social:socialActivity})\n  const readNotices=noticeRead[noticeOwner]||[]\n  const unreadNotices=notices.filter(n=>!readNotices.includes(n.id)).length\n  const markNotices=ids=>setNoticeRead(p=>({...p,[noticeOwner]:[...new Set([...(p[noticeOwner]||[]),...ids])]}))");
 s=once(s,'<${Community} publishSignal=','<${Community} onActivity=${setSocialActivity} noticeCount=${unreadNotices} onNotifications=${()=>setView({t:"notifications"})} publishSignal=');
 s=once(s,"view?.t!=='settings'","!['settings','notifications'].includes(view?.t)");
 s=once(s,'<${SettingsGear} onClick=${()=>setView({t:"settings"})}/></div></div>`}', '<${NotificationBell} count=${unreadNotices} onClick=${()=>setView({t:"notifications"})}/><${SettingsGear} onClick=${()=>setView({t:"settings"})}/></div></div>`}');
 const marker="onClick=${()=>setFiltersOpen(f=>!f)}>🎚️";s=once(s,marker,'aria-label="Filtros" onClick=${()=>setFiltersOpen(f=>!f)}>🎚️<span className="mn-gear-tip" role="tooltip">Filtros</span>');
 // Exact filter button selector, preserve existing counts.
 s=s.replace(/<button className="chip"([^>]*?aria-label="Filtros")/,'<button className="chip mn-filter"$1');
 s=once(s,'${view?.t==="settings"','${view?.t==="notifications"&&html`<${Overlay} title="Notificaciones" onBack=${()=>setView(null)}><${NotificationCenter} items=${notices} read=${readNotices} onRead=${id=>markNotices([id])} onAll=${()=>markNotices(notices.map(n=>n.id))} onOpen=${n=>{if(n.tab==="employment"){setView({t:"employment",initial:n.initial});return}if(n.tab==="social-inbox"){goTab("videos");setCommunityInboxSignal(x=>x+1);return}goTab(n.tab)}}/><//>`}\n${view?.t==="settings"');
 // Track actual recipient for chat messages; automated demo reply remains labeled sample.
 s=once(s,"{ me: true, t: body }","{ me: true, t: body, senderId:noticeOwner, recipientId:String(role==='Cliente'?job.providerId:job.clientId) }");
 s=once(s,"{ me: false, t: 'Gracias por el mensaje. Esta es una respuesta automática de la demo.' }","{ me: false, t: 'Gracias por el mensaje. Esta es una respuesta automática de la demo.', recipientId:noticeOwner, sample:true }");
 return s;
 });
 update('client/src/features/community/Community.jsx',s=>{
 s='import {NotificationBell} from "../notifications/NotificationCenter.jsx";\n'+s;
 s=once(s,'export function Community({publishSignal=0,','export function Community({onActivity,noticeCount=0,onNotifications,publishSignal=0,');
 s=once(s,'const [hidden,setHidden]=useState({})','const [hidden,setHidden]=useState({})\n useEffect(()=>{onActivity?.({posts,follows,threads,people:[...profiles,...clients]})},[posts,follows,threads,profiles,clients,onActivity])');
 s=once(s,'<${SettingsGear} video=${true} onClick=${onSettings}/>','<div className="mp-notification-tools"><${NotificationBell} count=${noticeCount} video=${true} onClick=${onNotifications}/><${SettingsGear} video=${true} onClick=${onSettings}/></div>');
 return s;
 });
 console.log('BETA: notification center with per-profile unread tracking, activity sources, filters and updated Explore caption.');
})();