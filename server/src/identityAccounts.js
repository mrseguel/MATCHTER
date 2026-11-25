import { createRemoteJWKSet, jwtVerify } from 'jose'

export const PROFILE_ROLES = Object.freeze(['Cliente','Maestro o contratista','Profesional','Empresa'])
const allowed = new Set(PROFILE_ROLES)

export class AuthError extends Error {
  constructor(status,message) { super(message); this.status=status }
}

// Trust only an explicitly configured issuer, audience and HTTPS JWKS URL.
// Never use a URL, issuer, algorithm or identity provided by the requesting client.
export function createIdentityVerifier({issuer,audience,jwksUrl,algorithms=['EdDSA','RS256','ES256']}, keyResolver) {
  if(typeof issuer!=='string'||typeof audience!=='string'||!audience||typeof jwksUrl!=='string') throw Error('Missing identity configuration')
  const issuerUrl=new URL(issuer), jwks=new URL(jwksUrl)
  if(issuerUrl.protocol!=='https:'||jwks.protocol!=='https:'||issuerUrl.origin!==jwks.origin||issuerUrl.username||issuerUrl.password||jwks.username||jwks.password) throw Error('Untrusted identity configuration')
  const resolver=keyResolver||createRemoteJWKSet(jwks,{timeoutDuration:5000,cooldownDuration:30000})
  return async (header)=>{
    const token=typeof header==='string'&&header.match(/^Bearer ([A-Za-z0-9._-]{20,8192})$/)
    if(!token)throw new AuthError(401,'Identidad no autenticada')
    try {
      const {payload}=await jwtVerify(token[1],resolver,{issuer,audience,algorithms,requiredClaims:['iss','aud','sub','exp','iat'],maxTokenAge:'15m',clockTolerance:5})
      if(typeof payload.sub!=='string'||!payload.sub.trim()||payload.sub.length>255)throw Error('Invalid subject')
      // Require the identity provider's verified-email claim before onboarding.
      if(payload.email_verified!==true)throw new AuthError(403,'Verifica tu correo electrónico')
      return Object.freeze({issuer:payload.iss,subject:payload.sub})
    } catch(error) {
      if(error instanceof AuthError)throw error
      throw new AuthError(401,'Identidad no autenticada')
    }
  }
}

export function createAccountService({db,verifyIdentity}) {
  if(typeof db?.query!=='function'||typeof verifyIdentity!=='function')throw Error('Missing authentication dependencies')
  const find=async identity=>{
    const result=await db.query('SELECT id, role FROM matchter.accounts WHERE auth_issuer=$1 AND auth_subject=$2',[identity.issuer,identity.subject])
    return result.rows[0]||null
  }
  const publicAccount=row=>({id:row.id,role:row.role})
  return Object.freeze({
    async me(header) {
      const identity=await verifyIdentity(header)
      const row=await find(identity)
      if(!row)throw new AuthError(404,'Completa tu perfil')
      return publicAccount(row)
    },
    async onboard(header,body) {
      const identity=await verifyIdentity(header)
      // Only the requested category is accepted; never accept an account ID, subject or privileges.
      if(!body||Object.keys(body).length!==1||!allowed.has(body.role))throw new AuthError(400,'Selecciona un tipo de cuenta válido')
      const result=await db.query('INSERT INTO matchter.accounts (auth_issuer,auth_subject,role) VALUES ($1,$2,$3) ON CONFLICT (auth_issuer,auth_subject) DO NOTHING RETURNING id,role',[identity.issuer,identity.subject,body.role])
      const row=result.rows[0]||await find(identity)
      if(!row)throw Error('Account transaction did not return a profile')
      if(row.role!==body.role)throw new AuthError(409,'Tu cuenta ya tiene un perfil asignado')
      return publicAccount(row)
    }
  })
}
