const day=86400000;
const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'});
const dateParts=d=>Object.fromEntries(parts.formatToParts(d).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
export function publicationTime(value,now=Date.now()){
 if(value==null||value==='')return '';
 const date=new Date(value),current=new Date(now);if(!Number.isFinite(+date)||!Number.isFinite(+current)||+date>+current)return '';
 const elapsed=+current-+date;
 if(elapsed<60000)return 'Ahora';
 if(elapsed<3600000){const n=Math.floor(elapsed/60000);return 'Hace '+n+' min'}
 if(elapsed<day){const n=Math.floor(elapsed/3600000);return 'Hace '+n+' h'}
 const a=dateParts(date),b=dateParts(current);
 const older=Number(b.year)-Number(a.year)>1||Number(b.year)-Number(a.year)===1&&(b.month+b.day>=a.month+a.day);
 return older?a.month+'-'+a.year.slice(-2):a.day+'-'+a.month;
}
export const demoPublicationTime=(i,now=Date.now())=>new Date(now-([12*60000,3*3600000,2*day,400*day][i%4])).toISOString();
