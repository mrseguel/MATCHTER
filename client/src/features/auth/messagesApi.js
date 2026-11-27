export async function messagesRequest(client,path,role,body,query={},fetcher=fetch){
 if(client?.qaReadOnly===true&&typeof client.qaRequest==='function'){if(body!==undefined)throw Error('Vista QA de solo lectura');return client.qaRequest(path,role,query)}
 const token=await client.getJWTToken()
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))throw Error('No se pudo comprobar tu sesión')
 const save=body!==undefined,params=new URLSearchParams({...query,role})
 const res=await fetcher('/api/auth-preview/messages'+(path?'/'+path:'')+(save?'':'?'+params),{method:save?'POST':'GET',headers:{Authorization:'Bearer '+token,...(save?{'Content-Type':'application/json'}:{})},...(save?{body:JSON.stringify({...body,role})}:{})})
 const data=await res.json().catch(()=>null)
 if(!res.ok)throw Error(data?.message||'No se pudieron consultar los mensajes')
 if(!data||typeof data!=='object')throw Error('Respuesta de mensajes no válida')
 return data
}
