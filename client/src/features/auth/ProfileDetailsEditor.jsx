import React,{useEffect,useState} from 'react'
import {ARAUCANIA_CITIES} from './araucaniaCities.js'
import {detailsRequest,emptyDetails} from './profileDetailsApi.js'
import {displayRole} from '../../profileRoles.js'
import './profileDetails.css'
export function ProfileDetailsEditor({client,role}){
 const [saved,setSaved]=useState(null),[draft,setDraft]=useState(emptyDetails),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0)
 const clientMode=role==='Cliente',trade=role==='Maestro o contratista',company=role==='Empresa'
 useEffect(()=>{let alive=true;setBusy(true);setError('');setNotice('');detailsRequest(client,role).then(d=>{if(alive){setSaved(d);setDraft(d)}}).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setBusy(false)});return()=>{alive=false}},[client,role,revision])
 const dirty=saved&&Object.keys(draft).some(k=>draft[k]!==saved[k])
 const field=k=>e=>{setDraft(d=>({...d,[k]:e.target.value}));setNotice('');setError('')}
 async function submit(e){e.preventDefault();if(busy||!saved||!dirty)return;setBusy(true);setError('');setNotice('');try{const data=await detailsRequest(client,role,draft);setSaved(data);setDraft(data);setNotice('Antecedentes guardados en Neon.')}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="mt-details" aria-label="Antecedentes de mi perfil">
 <div className="mt-details-title"><h3>Mis antecedentes</h3><span>{displayRole(role)}</span></div>
 <p className="mt-details-note">Los datos de cada modalidad se guardan por separado. Solo tú puedes ver y editar estos antecedentes en esta etapa.</p>
 {!saved?<>{busy?<p role="status">Cargando antecedentes…</p>:<button className="mai-secondary" onClick={()=>setRevision(v=>v+1)}>Reintentar</button>}</>:<form onSubmit={submit}>
 <label>Ciudad o localidad<select disabled={busy} value={draft.city} onChange={field('city')}><option value="">Selecciona tu ciudad</option>{ARAUCANIA_CITIES.map(c=><option key={c}>{c}</option>)}</select></label>
 {company&&<label>Nombre o razón social<input disabled={busy} value={draft.businessName} onChange={field('businessName')} maxLength={150} placeholder="Nombre de tu empresa"/><small>Dato declarado. No acredita representación legal.</small></label>}
 {!clientMode&&<label>{company?'Especialidad de la empresa':trade?'Oficio o especialidad':'Profesión o especialidad'}<input disabled={busy} value={draft.specialty} onChange={field('specialty')} maxLength={120} placeholder={trade?'Ej. Carpintería':company?'Ej. Construcción de viviendas':'Ej. Arquitectura'}/></label>}
 {trade&&<label>Modalidad de trabajo<select disabled={busy} value={draft.workMode} onChange={field('workMode')}><option value="">Selecciona tu modalidad</option><option value="Independiente">Maestro independiente</option><option value="Con equipo">Maestro con equipo</option><option value="Contratista">Contratista</option></select></label>}
 <label>{clientMode?'Acerca de mí':'Descripción de mis servicios'}<textarea disabled={busy} rows={4} maxLength={600} value={draft.bio} onChange={field('bio')} placeholder={clientMode?'Cuéntanos sobre tus necesidades de construcción.':'Describe tu experiencia y servicios.'}/><small>{draft.bio.length}/600 caracteres</small></label>
 {dirty&&<p className="mt-details-note">Tienes cambios sin guardar. Guárdalos antes de cambiar de perfil.</p>}
 <button type="submit" disabled={busy||!dirty}>{busy?'Guardando…':'Guardar antecedentes'}</button>
 </form>}
 {error&&<p className="mai-error" role="alert">{error}</p>}{notice&&<p className="mai-notice" role="status">{notice}</p>}
 </section>
}
