import React from 'react';
import {BriefcaseBusiness,MapPin,Search} from 'lucide-react';
export function ClientEmployment({state,onProfile}){
 const [query,setQuery]=React.useState('');
 const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const q=normalize(query).trim();
 const offers=(state?.offers||[]).filter(o=>o.status==='open'&&normalize([o.title,o.city,o.category,o.description,o.companyName].join(' ')).includes(q));
 return <section className="emp client-employment"><div className="card"><BriefcaseBusiness size={28} color="#ff5a00"/><h2>MATCHTER Empleos</h2><p>Conoce las oportunidades laborales de la construcción.</p><p className="mut">Desde tu perfil cliente puedes consultar las ofertas. Para publicar vacantes o postular, corresponde utilizar un perfil de empresa o trabajador.</p><button className="btn out" onClick={onProfile}>Ir a mi perfil</button></div><div className="card"><label className="client-employment-search"><Search size={19}/><input aria-label="Buscar ofertas laborales" placeholder="Buscar por cargo, especialidad o ciudad" value={query} onChange={e=>setQuery(e.target.value)}/></label></div><h3>Ofertas laborales disponibles</h3>{offers.length?offers.map(o=><div className="card" key={o.id}><b>{o.title}</b><p className="mut">{o.companyName||'Empresa demo'} · {o.type}</p><p className="client-employment-city"><MapPin size={15}/>{o.city}</p><p>{o.description}</p>{o.salary&&<p><b>{o.salary}</b></p>}<span className="tag">Oferta de demostración</span></div>):<p className="mut">No hay ofertas que coincidan con tu búsqueda.</p>}</section>
}
