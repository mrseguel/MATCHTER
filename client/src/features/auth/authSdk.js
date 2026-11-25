import {createAuthClient} from '@neondatabase/auth'
import {BetterAuthVanillaAdapter} from '@neondatabase/auth/vanilla/adapters'
// The pinned SDK may expose its Better Auth instance under adapter.
// Validate the concrete API shape before enabling the form.
export function createPreviewAuthClient(url){
 const sdk=createAuthClient(url,{adapter:BetterAuthVanillaAdapter()})
 const candidates=[sdk,sdk?.adapter,sdk?.auth]
 const auth=candidates.find(c=>c&&typeof c.signUp?.email==='function'&&typeof c.signIn?.email==='function'&&typeof c.getSession==='function'&&typeof c.signOut==='function')
 if(!auth)throw Error('El SDK no expone las operaciones de autenticación esperadas.')
 return {
  signUp:{email:args=>auth.signUp.email(args)},
  signIn:{email:args=>auth.signIn.email(args)},
  getSession:()=>auth.getSession(),
  signOut:()=>auth.signOut(),
  async getJWTToken(){
   if(typeof sdk.getJWTToken==='function'){
    const token=await sdk.getJWTToken();if(typeof token==='string'&&token.split('.').length===3)return token
   }
   const session=await auth.getSession()
   if(session.error)throw Error('No se pudo recuperar la sesión')
   const token=session.data?.session?.access_token
   if(typeof token==='string'&&token.split('.').length===3)return token
   if(typeof auth.token==='function'){
    const result=await auth.token();if(result.error)throw Error('No se pudo obtener el token de sesión')
    return result.data?.token||null
   }
   return null
  }
 }
}
