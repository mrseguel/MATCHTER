(function(){
const fs=require('node:fs'),update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)},once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,120));return s.replace(a,b)};
update('client/src/features/settings/Appearance.jsx',s=>{
s=once(s,"[Smartphone,'Uso de datos móviles'],","");
s=once(s,"[MessageCircle,'Contactar con MATCHTER'],","");
return s;
});
update('client/src/features/community/Community.jsx',s=>{
s='import {publicationTime,demoPublicationTime} from "./publicationTime.js";\nimport {BadgeCheck as PublicationBadge} from "lucide-react";\n'+s;
s=once(s,'DEMO_CLIPS.map(p=>({...p,likes:[],comments:[],sample:true}))','DEMO_CLIPS.map((p,i)=>({...p,likes:[],comments:[],sample:true,publishedAt:demoPublicationTime(i)}))');
s=once(s,'id:uid(),author:me,url,file,caption,category:','id:uid(),author:me,url,file,caption,publishedAt:new Date().toISOString(),category:');
s=once(s,"const [mode,setMode]=useState('all')","const [mode,setMode]=useState('all')\n const [publicationNow,setPublicationNow]=useState(Date.now)\n useEffect(()=>{if(!active)return;setPublicationNow(Date.now());const timer=setInterval(()=>setPublicationNow(Date.now()),30000);return()=>clearInterval(timer)},[active])");
const start=s.indexOf('<div className="cm-author-row">'),end=s.indexOf('</div><small>',start);
if(start<0||end<0)throw Error('Author row missing');
let row=s.slice(start,end);
if(!/verif|BadgeCheck|verified|a\?\.ver\b/i.test(row)){
 const close=row.lastIndexOf('</button>');
 if(close<0)throw Error('Author button missing');
 row=row.slice(0,close)+'${a?.ver&&html`<${PublicationBadge} className="cm-author-verified" size=${15} fill="#2589f5" color="#fff" aria-label="Perfil verificado de demostración"/>`}'+row.slice(close);
}
row+='${publicationTime(p.publishedAt,publicationNow)&&html`<span className="cm-published-at" title=${p.sample?"Fecha ilustrativa de publicación":new Date(p.publishedAt).toLocaleString("es-CL",{timeZone:"America/Santiago"})}>· ${publicationTime(p.publishedAt,publicationNow)}</span>`}';
s=s.slice(0,start)+row+s.slice(end);return s;
});
fs.appendFileSync('client/src/features/settings/appearance.css',`
.cm-author-row{align-items:center;gap:6px}.cm-author-row .cm-author{display:inline-flex;align-items:center;gap:4px}.cm-author-verified{flex:none;vertical-align:middle}.cm-published-at{font-size:11px;font-weight:500;color:#ddd;white-space:nowrap;text-shadow:0 1px 3px #0009}
`);
console.log('BETA: simplified Settings and dynamic MATCHPLAY publication dates, with illustrated seed dates and actual session upload times.');
})();