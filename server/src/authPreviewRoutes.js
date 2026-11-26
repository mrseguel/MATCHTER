import express from 'express'
import pg from 'pg'
import {createMessagesService} from './messagesService.js'
import {createSwipeService} from './swipeService.js'
import {createProfileDetailsService} from './profileDetails.js'
import {createProfilesService} from './accountProfiles.js'
import {createIdentityVerifier,createAccountService,AuthError} from './identityAccounts.js'

export function createAuthRouter(env=process.env, dependencies={}) {
  const router=express.Router()
  let service,pool
  // Only expose these routes on the explicitly approved protected integration alias.
  function configuredService(){
    if(service)return service
    const auth=new URL(env.MATCHTER_NEON_AUTH_URL)
    const jwks=new URL(env.MATCHTER_NEON_AUTH_JWKS_URL)
    if(auth.protocol!=='https:'||!auth.hostname.endsWith('.neon.tech')||jwks.href!==auth.href.replace(/\/$/,'')+'/.well-known/jwks.json')throw Error('Invalid Auth configuration')
    const dbUrl=new URL(env.MATCHTER_AUTH_DATABASE_URL)
    if(!['postgresql:','postgres:'].includes(dbUrl.protocol)||dbUrl.username!=='matchter_auth_app'||!dbUrl.hostname.endsWith('.neon.tech')||dbUrl.pathname!=='/neondb'||dbUrl.searchParams.get('sslmode')!=='require')throw Error('Invalid database configuration')
    for(const k of [...dbUrl.searchParams.keys()])if(['sslmode','sslcert','sslkey','sslrootcert','ssl','uselibpqcompat'].includes(k))dbUrl.searchParams.delete(k)
    pool=new pg.Pool({connectionString:dbUrl.href,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:8000,idleTimeoutMillis:3000,statement_timeout:5000,application_name:'matchter-auth-preview'})
    pool.on('error',()=>console.error('Matchter auth pool error'))
    const verifyIdentity=createIdentityVerifier({issuer:auth.origin,audience:auth.origin,jwksUrl:jwks.href,algorithms:['EdDSA']})
    service={...createAccountService({db:pool,verifyIdentity}),profiles:createProfilesService({db:pool,verifyIdentity}),details:createProfileDetailsService({db:pool,verifyIdentity}),swipe:createSwipeService({db:pool,verifyIdentity}),messages:createMessagesService({db:pool,verifyIdentity})}
    return service
  }
  router.use((req,res,next)=>{
    res.set('Cache-Control','no-store')
    const origin=env.MATCHTER_AUTH_TEST_ORIGIN
    if(!origin||req.get('host')!==new URL(origin).host)return res.status(404).json({message:'No disponible'})
    if(req.method==='POST'&&req.get('origin')!==origin)return res.status(403).json({message:'Origen no autorizado'})
    next()
  })
  router.get('/config',(_req,res)=>{
    if(!env.MATCHTER_NEON_AUTH_URL)return res.status(503).json({message:'Autenticación no configurada'})
    return res.json({authUrl:env.MATCHTER_NEON_AUTH_URL})
  })
  const handle=fn=>async(req,res)=>{
    if(!/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(req.get('authorization')||''))return res.status(401).json({message:'Identidad no autenticada'})
    try{const svc=dependencies.service||configuredService();return res.json(await fn(svc,req))}
    catch(error){if(error instanceof AuthError)return res.status(error.status).json({message:error.message});console.error('Matchter auth request failed');return res.status(503).json({message:'Autenticación temporalmente no disponible'})}
  }
  router.get('/me',handle((svc,req)=>svc.me(req.get('authorization'))))
  router.post('/onboard',handle((svc,req)=>svc.onboard(req.get('authorization'),req.body)))
  router.get('/profiles',handle((svc,req)=>svc.profiles.list(req.get('authorization'))))
  router.post('/profiles/switch',handle((svc,req)=>svc.profiles.switch(req.get('authorization'),req.body)))
  router.get('/profiles/details',handle((svc,req)=>svc.details.get(req.get('authorization'),req.query.role)))
  router.post('/profiles/details',handle((svc,req)=>svc.details.save(req.get('authorization'),req.body)))
  router.get('/swipe/cards',handle((s,r)=>s.swipe.browse(r.get('authorization'),r.query)))
  router.get('/swipe/own',handle((s,r)=>s.swipe.own(r.get('authorization'),r.query.role)))
  router.post('/swipe/publish',handle((s,r)=>s.swipe.publish(r.get('authorization'),r.body)))
  router.post('/swipe/hide',handle((s,r)=>s.swipe.hide(r.get('authorization'),r.body)))
  router.get('/swipe/favorites',handle((s,r)=>s.swipe.favorites(r.get('authorization'),r.query.role)))
  router.post('/swipe/favorite',handle((s,r)=>s.swipe.favorite(r.get('authorization'),r.body)))
  router.get('/swipe/requests',handle((s,r)=>s.swipe.requests(r.get('authorization'),r.query.role)))
  router.post('/swipe/invite',handle((s,r)=>s.swipe.invite(r.get('authorization'),r.body)))
  router.post('/swipe/respond',handle((s,r)=>s.swipe.respond(r.get('authorization'),r.body)))
  router.get('/messages',handle((s,r)=>s.messages.list(r.get('authorization'),r.query.role)))
  router.get('/messages/history',handle((s,r)=>s.messages.history(r.get('authorization'),r.query)))
  router.post('/messages/send',handle((s,r)=>s.messages.send(r.get('authorization'),r.body)))
  router.get('/messages/agreement',handle((s,r)=>s.messages.agreement(r.get('authorization'),r.query)))
  router.post('/messages/agreement',handle((s,r)=>s.messages.changeAgreement(r.get('authorization'),r.body)))
  router.get('/messages/contract',handle((s,r)=>s.messages.contract(r.get('authorization'),r.query)))
  router.post('/messages/contract',handle((s,r)=>s.messages.changeContract(r.get('authorization'),r.body)))
  return router
}
