export async function swipeRequest(client,path,role,body,query={},fetcher=fetch){
 const token=await client.getJWTToken()
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))throw Error('No se pudo comprobar tu sesión')
 const save=body!==undefined
 const params=new URLSearchParams({role,...query})
 const res=await fetcher('/api/auth-preview/swipe/'+path+(save?'':'?'+params),{method:save?'POST':'GET',headers:{Authorization:'Bearer '+token,...(save?{'Content-Type':'application/json'}:{})},...(save?{body:JSON.stringify({...body,role})}:{})})
 const data=await res.json().catch(()=>null)
 if(!res.ok)throw Error(data?.message||'No se pudo completar la operación (HTTP '+res.status+')')
 if(!data||typeof data!=='object')throw Error('Respuesta de SWIPE no válida')
 return data
}
