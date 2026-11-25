import {BetterAuthVanillaAdapter} from '@neondatabase/auth/vanilla/adapters'
const isJWT=token=>typeof token==='string'&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
// The public Better Auth client is a dynamic proxy. Checking arbitrary method
// names on that proxy is not a valid capability check. Use the concrete adapter.
export function wrapAuthAdapter(adapter){
 if(!adapter||typeof adapter.getBetterAuthInstance!=='function'||typeof adapter.getJWTToken!=='function')throw Error('Adaptador de autenticación incompatible')
 const auth=adapter.getBetterAuthInstance()
 return {
  signUp:{email:args=>auth.signUp.email(args)},
  signIn:{email:args=>auth.signIn.email(args)},
  emailOtp:{verifyEmail:args=>auth.emailOtp.verifyEmail(args),sendVerificationOtp:args=>auth.emailOtp.sendVerificationOtp(args)},
  getSession:()=>auth.getSession(),
  signOut:()=>auth.signOut(),
  async getJWTToken(){
   const session=await auth.getSession()
   if(session.error||!session.data?.user)throw Error('No se pudo recuperar la sesión de Neon')
   const token=session.data?.session?.access_token
   if(isJWT(token))return token
   try{
    const jwt=await adapter.getJWTToken(false)
    if(isJWT(jwt))return jwt
   }catch(e){throw Error('Neon no entregó el token de acceso'+(e?.status?' (HTTP '+e.status+')':'')+'. Vuelve a iniciar sesión.')}
   throw Error('Neon no entregó un token de acceso válido. Vuelve a iniciar sesión.')
  }
 }
}
export function createPreviewAuthClient(url){
 return wrapAuthAdapter(BetterAuthVanillaAdapter()(url))
}
