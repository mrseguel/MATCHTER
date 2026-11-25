import React,{createContext,useContext,useEffect,useState,useRef} from 'react'
import {Landing} from '../../approved/visual.js'
import {RoleIcon} from './AuthPreview.jsx'
import {createPreviewAuthClient} from './authSdk.js'
import {ACCOUNT_TYPES,roleForLabel,canonicalEmail,completeIdentity,accountRequest} from './realAuthFlow.js'
import './auth.css'
import './authIntegration.css'

const Context=createContext(null)
const callbackURL='https://matchter-beta-auth.vercel.app/'
async function readSession(client){
 const r=await client.getSession()
 if(r.error)throw Error('No se pudo comprobar la sesión')
 return r.data?.user?r.data:null
}
export default function AuthLanding(){
 const [client,setClient]=useState(null),[session,setSession]=useState(null),[profile,setProfile]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const started=useRef(false)
 async function load(){
  setBusy(true);setError('')
  try{
   const res=await fetch('/api/auth-preview/config')
   if(!res.ok)throw Error('No se pudo obtener la configuración')
   const {authUrl}=await res.json(),auth=createPreviewAuthClient(authUrl)
   const next=await readSession(auth)
   const saved=await completeIdentity(auth,next,null)
   setClient(auth);setSession(next);setProfile(saved)
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{if(!started.current){started.current=true;load()}},[])
 async function logout(){
  setBusy(true);setError('')
  try{const r=await client.signOut();if(r.error)throw Error('No se pudo cerrar la sesión');setSession(null);setProfile(null)}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const complete=(next,saved)=>{setSession(next);setProfile(saved)}
 if(!client)return <main className="mai-page"><section className="mai-card"><h1>Matchter</h1><p>{error||'Comprobando sesión…'}</p>{error&&<button disabled={busy} onClick={load}>Volver a intentar</button>}</section></main>
 if(profile)return <main className="mai-page"><section className="mai-card"><h1>Matchter</h1><p className="mai-note">Entorno privado · Cuenta real verificada. Los módulos de servicios todavía son de demostración y no están conectados a esta identidad.</p><h2>Sesión iniciada</h2><p>{session?.user?.email}</p><p>Perfil persistente: <b>{profile.role}</b></p>{error&&<p role="alert" className="mai-error">{error}</p>}<button disabled={busy} onClick={load}>Comprobar cuenta guardada</button><button className="mai-secondary" disabled={busy} onClick={logout}>Cerrar sesión</button></section></main>
 return <Context.Provider value={{client,session,complete,logout,busy,error}}>
   <Landing onEnter={()=>{}} AuthComponent={RealAuthModal}/>
   {session&&<RealAuthModal mode="Completar perfil" types={ACCOUNT_TYPES} onClose={logout}/>}
 </Context.Provider>
}

function RealAuthModal({mode,types,onClose}){
 const ctx=useContext(Context),client=ctx.client
 const [step,setStep]=useState(ctx.session?(ctx.session.user.emailVerified?'finish':'verify'):mode==='Crear cuenta'?'role':'login')
 const [label,setLabel]=useState(''),[first,setFirst]=useState(''),[last,setLast]=useState(''),[email,setEmail]=useState(ctx.session?.user?.email||''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[show,setShow]=useState(false),[otp,setOtp]=useState(''),[pending,setPending]=useState(null),[localSession,setLocalSession]=useState(ctx.session),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const company=label==='Perfil empresas'
 const clearPasswords=()=>{setPassword('');setConfirm('');setShow(false)}
 function change(next){setError('');setNotice('');clearPasswords();setOtp('');setStep(next)}
 async function run(fn){if(busy||ctx.busy)return;setBusy(true);setError('');setNotice('');try{await fn()}catch(e){setError(e.message||'No se pudo completar la operación')}finally{setBusy(false)}}
 async function finish(next,choice=pending){
  setLocalSession(next)
  if(!next?.user){change('login');setNotice('Correo verificado. Inicia sesión con tu contraseña.');return}
  setEmail(next.user.email)
  if(!next.user.emailVerified){change('verify');setNotice('Verifica tu correo con el código recibido.');return}
  const saved=await completeIdentity(client,next,choice)
  if(saved){ctx.complete(next,saved);return}
  change('finish')
 }
 function choose(value){roleForLabel(value);setLabel(value);change('register')}
 async function submit(e){e.preventDefault();await run(async()=>{
  const address=canonicalEmail(email)
  if(step==='register'){
   roleForLabel(label)
   if(password!==confirm)throw Error('Las contraseñas no coinciden')
   const name=company?first.trim():[first.trim(),last.trim()].filter(Boolean).join(' ')
   if(!name||(!company&&!last.trim()))throw Error('Completa tu nombre')
   const result=await client.signUp.email({email:address,password,name,callbackURL})
   clearPasswords()
   if(result.error)throw Error(result.error.message||'No se pudo registrar')
   setPending({email:address,label});setOtp('');setStep('verify');setNotice('Ingresa el código enviado a tu correo.');return
  }
  const result=await client.signIn.email({email:address,password,callbackURL})
  clearPasswords()
  if(result.error)throw Error(result.error.message||'No se pudo iniciar sesión')
  await finish(await readSession(client))
 })}
 async function verify(e){e.preventDefault();await run(async()=>{
  const result=await client.emailOtp.verifyEmail({email:canonicalEmail(email),otp:otp.trim()})
  if(result.error)throw Error(result.error.message||'No se pudo verificar el código')
  setOtp('');await finish(await readSession(client))
 })}
 async function resend(){await run(async()=>{
  if(!email.includes('@'))throw Error('Ingresa un correo electrónico válido')
  const r=await client.emailOtp.sendVerificationOtp({email:canonicalEmail(email),type:'email-verification'})
  if(r.error)throw Error(r.error.message||'No se pudo enviar otro código')
  setNotice('Si corresponde, recibirás un nuevo código.')
 })}
 async function recoverRole(value){await run(async()=>{
  const next=await readSession(client)
  if(!next?.user?.emailVerified)throw Error('Debes verificar tu correo e iniciar sesión')
  await finish(next,{email:next.user.email,label:value})
 })}
 const blocked=busy||ctx.busy
 const close=()=>{if(!blocked)onClose()}
 const titles={role:'Crear cuenta',register:'Crear cuenta',login:'Iniciar sesión',verify:'Verifica tu correo',finish:'Completar perfil'}
 return <div className="modal beta-auth-modal" onClick={close}><div className="sheet beta-auth-sheet" role="dialog" aria-modal="true" aria-labelledby="beta-real-title" onClick={e=>e.stopPropagation()}>
  <div className="row sp"><b id="beta-real-title" style={{fontSize:18}}>{titles[step]}</b><button className="chip" onClick={close} disabled={blocked} aria-label={ctx.session?'Cerrar sesión':'Cerrar'}>{ctx.session?'Cerrar sesión':'✕'}</button></div>
  <div className="beta-auth-notice">Integración privada · El registro y la verificación son reales. Usa datos de prueba. Los servicios de Matchter aún no están vinculados a esta cuenta.</div>
  {(error||ctx.error)&&<p className="beta-auth-error" role="alert">{error||ctx.error}</p>}
  {notice&&<p className="mut" role="status">{notice}</p>}
  {(step==='role'||step==='finish')?<><p className="mut">{step==='finish'?'Tu cuenta verificada todavía no tiene un tipo de perfil.':'Elige tu tipo de perfil'}</p>{types.map(t=><button key={t[1]} className="opt" disabled={blocked} onClick={()=>step==='finish'?recoverRole(t[1]):choose(t[1])}><span className="i"><RoleIcon type={t[1]} fallback={t[0]}/></span><span><b>{t[1]}</b><small>{t[2]}</small></span></button>)}
   {step==='role'&&<button className="beta-auth-switch" disabled={blocked} onClick={()=>change('login')}>¿Ya tienes cuenta? Iniciar sesión</button>}</>:step==='verify'?<form className="beta-auth-form" onSubmit={verify}>
   <label>Correo electrónico<input type="email" required value={email} readOnly={Boolean(pending||localSession)} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
   <label>Código de verificación<input required value={otp} onChange={e=>setOtp(e.target.value)} autoComplete="one-time-code" inputMode="numeric" maxLength={12} pattern="[0-9]+"/></label>
   <button className="btn" disabled={blocked}>{blocked?'Verificando…':'Verificar código'}</button>
   <button type="button" className="beta-auth-switch" disabled={blocked} onClick={resend}>Solicitar un código nuevo</button>
   <button type="button" className="beta-auth-switch" disabled={blocked} onClick={()=>change('login')}>Volver a iniciar sesión</button>
  </form>:<form className="beta-auth-form" onSubmit={submit}>
  {step==='register'&&<><div className="beta-auth-role"><span>{label}</span><button type="button" disabled={blocked} onClick={()=>change('role')}>Cambiar</button></div>
   <label>{company?'Nombre o razón social de la empresa *':'Nombre *'}<input required maxLength={company?150:80} value={first} onChange={e=>setFirst(e.target.value)} autoComplete={company?'organization':'given-name'}/></label>
   {!company&&<label>Apellidos *<input required maxLength={80} value={last} onChange={e=>setLast(e.target.value)} autoComplete="family-name"/></label>}
   <small className="mut">Los datos adicionales del perfil se incorporarán cuando se conecte su almacenamiento seguro.</small></>}
   <label>Correo electrónico<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false}/></label>
   <label>Contraseña<div className="beta-auth-password"><input type={show?'text':'password'} required minLength={step==='register'?12:undefined} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={step==='register'?'new-password':'current-password'}/><button type="button" onClick={()=>setShow(v=>!v)}>{show?'Ocultar':'Ver'}</button></div></label>
   {step==='register'&&<label>Confirmar contraseña<input type={show?'text':'password'} required value={confirm} onChange={e=>setConfirm(e.target.value)} maxLength={128} autoComplete="new-password"/></label>}
   <button className="btn" disabled={blocked}>{blocked?'Comprobando…':step==='register'?'Crear cuenta':'Iniciar sesión'}</button>
   {step==='login'&&<button type="button" className="beta-auth-switch" disabled={blocked} onClick={()=>{setPending(null);change('verify')}}>Verificar correo de una cuenta existente</button>}
   <button type="button" className="beta-auth-switch" disabled={blocked} onClick={()=>{setPending(null);change(step==='login'?'role':'login')}}>{step==='login'?'¿No tienes cuenta? Crear cuenta':'¿Ya tienes cuenta? Iniciar sesión'}</button>
  </form>}
 </div></div>
}
