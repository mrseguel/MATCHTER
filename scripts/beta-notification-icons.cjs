(function(){
 const fs=require('node:fs'),f='client/src/features/notifications/NotificationCenter.jsx';let s=fs.readFileSync(f,'utf8');const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Expected anchor: '+a);s=s.replace(a,b)};
 once("import {Bell,CheckCheck,ChevronRight,Inbox} from 'lucide-react';","import {Bell,CheckCheck,ChevronRight,Inbox,Heart,UserPlus,MessageCircle,Play,Handshake,FilePen,Calculator,Briefcase,Wallet,ShieldAlert,ShieldCheck} from 'lucide-react';\nimport {notificationIcon} from './iconKind.js';\nconst noticeIcons={heart:Heart,'user-plus':UserPlus,'message-circle':MessageCircle,play:Play,handshake:Handshake,'file-pen':FilePen,calculator:Calculator,briefcase:Briefcase,wallet:Wallet,'shield-alert':ShieldAlert,'shield-check':ShieldCheck,bell:Bell};\nfunction NoticeIcon({notice}){const Icon=noticeIcons[notificationIcon(notice)]||Bell;return <span className=\"nc-icon\" aria-hidden=\"true\"><Icon size={21} strokeWidth={1.85}/></span>}");
 once('<span className="nc-dot"/>','<NoticeIcon notice={n}/>');
 once('<small>{n.category}{n.reminder?', '<small>{n.category==="Mensajes"?"Mensajes":n.category==="Empleos"?"MATCHTER EMPLEOS":n.category}{n.reminder?');
 once('<ChevronRight size={16}/></button>)','<span className="nc-indicator"><span className="nc-dot"/><ChevronRight size={16}/></span></button>)');
 fs.writeFileSync(f,s);
 fs.appendFileSync('client/src/features/notifications/notifications.css',`
/* Approved visual language: a different orange icon for every event type. */
.nc-item{gap:11px;padding:13px 11px;align-items:center;background:var(--card)}
.nc-item.unread{background:var(--card);border-color:var(--line)}
.nc-icon{display:grid;place-items:center;width:40px;height:40px;flex:0 0 40px;border-radius:11px;background:#f4f5f7;color:#ff5a00}
[data-matchter-theme=dark] .nc-icon{background:#262626;color:#ff6b20}
.nc-content{gap:4px}.nc-content small{font-size:11px;color:var(--tx);font-weight:750;line-height:1.25}.nc-content b{font-size:13px;font-weight:650;line-height:1.35}.nc-content>span{line-height:1.4}
.nc-indicator{display:flex;align-items:center;gap:4px;color:var(--mut);flex:none}.nc-indicator .nc-dot{width:7px;height:7px}.nc-item:not(.unread) .nc-dot{visibility:hidden}
`);
 console.log('BETA: notification-specific orange icons, original category and content, unread dot on right; existing notification logic untouched.');
})();