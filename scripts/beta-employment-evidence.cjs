(function(){
 const fs=require('node:fs'),root='client/src/features/employment/';
 const update=(file,fn)=>{let s=fs.readFileSync(file,'utf8');s=fn(s);fs.writeFileSync(file,s)};
 const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Expected one anchor: '+a.slice(0,120));return s.replace(a,b)};
 update(root+'RoleProfileHome.jsx',s=>{
 const start=s.indexOf('<div className="card rp-account"><h3>{company?');
 const end=s.indexOf('<div className="card rp-account"><h3><Star',start);
 if(start<0||end<0)throw Error('Account card not found');
 let block=s.slice(start,end);
 block=once(block,"'Correo','Teléfono','Ciudad']:","'Correo','Teléfono','Ciudad','Dirección']:");
 block=once(block,'Datos referenciales. La información legal y de contacto es privada.','Datos referenciales. La información legal y de contacto debe mantenerse privada y verificarse antes de contratar.');
 s=s.slice(0,start)+'{!company&&'+block+'}'+s.slice(end);
 const anchor='{client?<><h3>Mis proyectos y contrataciones';
 s=once(s,anchor,'{company&&'+block+'}'+anchor);
 return s;
 });
 update(root+'model.js',s=>{
 s='import {platformEvidence} from "./platformEvidence.js";\n'+s;
 s=once(s,'export function makeCV(person,cv){','export function makeCV(person,cv,context={}){');
 s=once(s,'city:clean(person.loc)};','city:clean(person.loc),matchter:platformEvidence(person,context)};');
 s=once(s,'export function applyOffer(s,p,r,oid,uid,consent){','export function applyOffer(s,p,r,oid,uid,consent,context={}){');
 s=once(s,'makeCV(p,s.cvs[id(p.id)]);','makeCV(p,s.cvs[id(p.id)],context);');
 return s;
 });
 update(root+'EmploymentHub.jsx',s=>{
 const anchor='<small className="mut">Información declarada por el postulante · CV de prueba.</small>';
 s=once(s,anchor,`<div className="emp-platform"><h4>Trayectoria en MATCHTER</h4><small className="mut">Información incorporada automáticamente desde la aplicación, separada de los antecedentes declarados por el postulante.</small>{cv.matchter?.rating?<div className="emp-rating"><span aria-hidden="true">★</span><b>{cv.matchter.rating.score.toFixed(1)} / 5</b><small>{cv.matchter.rating.count} evaluaciones · referenciales</small></div>:<p className="mut">Sin calificaciones disponibles.</p>}<h4>Trabajos confirmados en MATCHTER</h4>{cv.matchter?.works?.length?cv.matchter.works.map(w=><div className="emp-work" key={w.id}><b>{w.title}</b><p>{w.description}</p><small className="mut">Registro de prueba · confirmación y fotografías vinculadas al contrato.</small><div className="emp-work-photos">{w.photos.map((p,i)=><figure key={i}><img src={p.url} alt={p.caption}/><figcaption>{p.caption}</figcaption></figure>)}</div></div>):<p className="mut">Todavía no hay trabajos finalizados y confirmados por un cliente con autorización para compartir. Las fotos del portafolio personal no acreditan por sí solas un trabajo.</p>}</div><small className="mut">Currículum de demostración. Las calificaciones no son verificaciones reales.</small>`);
 s=once(s,"state,setState,initial='offers'","state,setState,initial='offers',jobs=[],portfolio=[]");
 s=once(s,"const showCV=(p,d)=>{try{setPreview(makeCV(p,d));","const showCV=(p,d)=>{try{setPreview(makeCV(p,d,{jobs,portfolio}));");
 s=once(s,"selected.id,uid(),consent)","selected.id,uid(),consent,{jobs,portfolio})");
 s=once(s,'<p>{o.salary}</p><button className="btn out sm"','<p><b>{o.salary}</b></p><small className="emp-category">{o.category}</small><p className="emp-card-summary">{o.description}</p><div className="emp-card-requirements"><b>Requisitos principales</b><p>{o.requirements}</p></div><button className="btn out sm"');
 return s;
 });
 update('client/src/App.jsx',s=>once(s,'state=${employment} setState=${setEmployment} initial=${view.initial}/>', 'state=${employment} setState=${setEmployment} initial=${view.initial} jobs=${jobs} portfolio=${portfolio}/>'));
 fs.appendFileSync(root+'employment.css',`\n.emp-platform{background:#f7f9fb;border:1px solid #e1e6eb;border-radius:10px;padding:11px;display:grid;gap:9px}.emp-platform h4{margin:0}.emp-rating{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.emp-rating>span{color:#f59e0b;font-size:19px}.emp-rating small{color:#66768a}.emp-work{display:grid;gap:6px;padding:8px 0;border-top:1px solid #e2e8f0}.emp-work-photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.emp-work-photos figure{margin:0}.emp-work-photos img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:7px}.emp-work-photos figcaption{font-size:10px;color:#66768a}.emp-category{color:#c44700;font-size:11px;font-weight:600}.emp-card-summary{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}.emp-card-requirements{background:#f6f7f9;border-radius:8px;padding:9px;display:grid;gap:4px;font-size:11px}.emp-card-requirements p{font-size:12px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}\n`);
 console.log('BETA: company details first; richer employment cards; automatic demo rating and gated contract evidence in CV.');
})();