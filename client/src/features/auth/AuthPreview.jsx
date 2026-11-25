import React,{useState} from 'react';
import {registerTest,loginTest} from './testAccounts.js';
import './auth.css';
const initial={firstName:'',lastName:'',companyName:'',legalRepresentative:'',companyRut:'',representativeRut:'',email:'',phone:'',city:'',sector:'',address:'',password:'',confirm:''};
function GoogleIcon(){return <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.93H24v7.44h11a9.4 9.4 0 0 1-4.08 6.17v5.13h6.6c3.86-3.56 6.09-8.81 6.09-14.81Z"/><path fill="#34A853" d="M24 44c5.51 0 10.14-1.83 13.52-4.73l-6.6-5.13c-1.83 1.23-4.18 1.96-6.92 1.96-5.33 0-9.85-3.6-11.46-8.43H5.73v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.54 27.67a12.02 12.02 0 0 1 0-7.34v-5.3H5.73a20 20 0 0 0 0 17.94Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1.03 7.82 3.05l5.86-5.86C34.14 5.79 29.51 4 24 4A20 20 0 0 0 5.73 15.03l6.81 5.3C14.15 15.5 18.67 11.9 24 11.9Z"/></svg>}
function AppleIcon(){return <svg width="19" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.1 12.1c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.8-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.1 9.2.7 1 1.5 2.1 2.6 2.1s1.6-.7 3-.7c1.4 0 1.8.7 3 .7s1.9-1 2.6-2c.8-1.2 1.2-2.4 1.3-2.5-.1 0-2-.8-1.9-4.2ZM14.8 5.7c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2.2-.5 2.8-1.3Z"/></svg>}
function RoleIcon({type,fallback}){
 const role=String(type).toLowerCase();
 const shapes=role.includes('empresa')?<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M16 15h.01"/></>:role.includes('profesional')||role.includes('contratista')?<><path d="M2 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2H2zM5 16v-3a7 7 0 0 1 4-6.3M19 16v-3a7 7 0 0 0-4-6.3M9 12V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"/></>:role.includes('maestro')?<><path d="m14.5 12.5-8 8a2.12 2.12 0 0 1-3-3l8-8M16 4l4 4-2.5 2.5-1.5-1.5-3 3-4-4 3-3L11 4a7 7 0 0 1 5 0Z"/></>:role.includes('cliente')?<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/></>:null;
 return shapes?<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes}</svg>:fallback;
}
export function AuthPreview({mode,types,onEnter,onClose}){
 const [step,setStep]=useState(mode==='Crear cuenta'?'role':'login'),[type,setType]=useState('');
 const [form,setForm]=useState(initial),[show,setShow]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const company=type==='Perfil empresas';
 const update=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
 const change=s=>{setStep(s);setError('');setShow(false);setForm(initial)};
 const field=(key,title,options={})=><label key={key}>{title}<input value={form[key]} onChange={update(key)} {...options}/></label>;
 const submit=async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');
 try{const user=step==='register'?await registerTest({...form,type}):await loginTest(form.email,form.password);setForm(initial);onEnter({...user,mode:step==='register'?'Crear cuenta':'Iniciar sesión'})}
 catch(e){setError(e.message)}finally{setBusy(false)}};
 return <div className="modal beta-auth-modal" onClick={onClose}><div className="sheet beta-auth-sheet" role="dialog" aria-modal="true" aria-labelledby="beta-auth-title" onClick={e=>e.stopPropagation()}>
 <div className="row sp"><b id="beta-auth-title" style={{fontSize:18}}>{step==='login'?'Iniciar sesión':'Crear cuenta'}</b><button className="chip" onClick={onClose} aria-label="Cerrar">✕</button></div>
 <div className="beta-auth-notice">Beta privada · Solo datos ficticios. No ingreses datos personales ni contraseñas reales. Las cuentas de prueba duran mientras esta página permanezca abierta.</div>
 {step==='role'?<><p className="mut">Elige tu tipo de perfil</p>{types.map(t=><button key={t[1]} className="opt" onClick={()=>{setType(t[1]);change('register')}}><span className="i"><RoleIcon type={t[1]} fallback={t[0]}/></span><span><b>{t[1]}</b><small>{t[2]}</small></span></button>)}<button className="beta-auth-switch" onClick={()=>change('login')}>¿Ya tienes cuenta? Iniciar sesión</button></>:<form className="beta-auth-form" onSubmit={submit} autoComplete="off">
 {step==='register'&&<><div className="beta-auth-role"><span>{type}</span><button type="button" onClick={()=>change('role')}>Cambiar</button></div>
 {company?<>{field('companyName','Nombre o razón social de la empresa *',{required:true,maxLength:150,placeholder:'Ej. Constructora Ejemplo SpA'})}
 {field('legalRepresentative','Nombre del representante legal (opcional)',{maxLength:150,placeholder:'Nombre y apellidos'})}
 {field('companyRut','RUT de la empresa (opcional)',{maxLength:14,placeholder:'RUT ficticio'})}
 {field('representativeRut','RUT del representante legal (opcional)',{maxLength:14,placeholder:'RUT ficticio'})}
 <div className="beta-auth-legal-note"><b>Facilita tus futuras contrataciones</b><p>Recomendamos completar estos datos para futuras coincidencias con clientes, contrataciones de servicios y firmas de contratos. En la versión definitiva, los RUT serán privados y deberán verificarse antes de formalizar un contrato.</p></div>
 </>:<>{field('firstName','Nombre *',{required:true,maxLength:80,placeholder:'Tu nombre'})}{field('lastName','Apellidos *',{required:true,maxLength:80,placeholder:'Tus apellidos'})}</>}
 </>}
 {field('email',step==='register'?'Correo electrónico *':'Correo electrónico',{required:true,type:'email',autoCapitalize:'none',autoCorrect:'off',spellCheck:false,maxLength:254,placeholder:'cuenta@example.test'})}
 {step==='register'&&<>{field('phone','Número de teléfono (opcional)',{type:'tel',maxLength:20,placeholder:'+56 9 …'})}
 {field('city','Ciudad o comuna (opcional)',{maxLength:100,placeholder:'Ej. Temuco'})}
 {field('sector','Sector (opcional)',{maxLength:100,placeholder:'Ej. Labranza'})}
 {field('address','Dirección (opcional y privada)',{maxLength:180,placeholder:'Calle y número'})}</>}
 <label>Contraseña<div className="beta-auth-password"><input required type={show?'text':'password'} value={form.password} onChange={update('password')} minLength={step==='register'?10:undefined} maxLength={128} autoComplete="off" placeholder="Contraseña de prueba"/><button type="button" onClick={()=>setShow(s=>!s)}>{show?'Ocultar':'Ver'}</button></div></label>
 {step==='register'&&<label>Confirmar contraseña<input required type={show?'text':'password'} value={form.confirm} onChange={update('confirm')} autoComplete="off" maxLength={128}/></label>}
 {error&&<p className="beta-auth-error" role="alert">{error}</p>}
 <button className="btn" disabled={busy} type="submit">{busy?'Comprobando…':step==='register'?'Crear cuenta':'Iniciar sesión'}</button>
 {step==='login'&&<div className="beta-oauth"><div className="beta-oauth-divider"><span>o continúa con</span></div><button type="button" className="beta-oauth-google" onClick={()=>setError('Google aún no está conectado. Disponible después de configurar el proveedor de identidad.')}><GoogleIcon/>Continuar con Google</button><button type="button" className="beta-oauth-apple" onClick={()=>setError('Apple aún no está conectado. Disponible después de configurar Sign in with Apple.')}><AppleIcon/>Continuar con Apple</button><small>Accesos externos pendientes de activación.</small></div>}
 <button type="button" className="beta-auth-switch" onClick={()=>change(step==='login'?'role':'login')}>{step==='login'?'¿No tienes cuenta? Crear cuenta':'¿Ya tienes cuenta? Iniciar sesión'}</button>
 </form>}
 <details className="beta-auth-demo"><summary>Entrar con los perfiles ficticios existentes</summary>{types.map(t=><button key={t[1]} className="opt" onClick={()=>onEnter({mode:'Demo',type:t[1]})}><span className="i">{t[0]}</span><span><b>{t[1]}</b><small>{t[2]}</small></span></button>)}</details>
 </div></div>;
}
