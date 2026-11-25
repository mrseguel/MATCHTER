import {ROLE_DISPLAY} from '../../profileRoles.js'
export const emptyDetails=()=>({city:'',specialty:'',bio:'',workMode:'',businessName:''})
export async function detailsRequest(client,role,details,fetcher=fetch){
 if(!Object.hasOwn(ROLE_DISPLAY,role))throw Error('Perfil no válido')
 const token=await client.getJWTToken()
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))throw Error('No se pudo comprobar tu sesión')
 const save=details!==undefined,url='/api/auth-preview/profiles/details'+(save?'':'?role='+encodeURIComponent(role))
 const response=await fetcher(url,{method:save?'POST':'GET',headers:{Authorization:'Bearer '+token,...(save?{'Content-Type':'application/json'}:{})},...(save?{body:JSON.stringify({role,details})}:{})})
 const data=await response.json().catch(()=>null)
 if(!response.ok)throw Error(data?.message||'No se pudieron consultar los antecedentes')
 if(data?.role!==role||!data.details||Object.keys(emptyDetails()).some(k=>typeof data.details[k]!=='string'))throw Error('Respuesta de antecedentes no válida')
 return Object.fromEntries(Object.keys(emptyDetails()).map(k=>[k,data.details[k]]))
}
