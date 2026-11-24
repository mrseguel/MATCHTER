export const identity = value => String(value ?? '')
export const pairKey = (a,b) => JSON.stringify([identity(a),identity(b)].sort())
export const toggleMember = (items,id) => items.includes(identity(id)) ? items.filter(x=>x!==identity(id)) : [...items,identity(id)]
export const mayHire = (role,actor,author,providers) => role==='Cliente' && identity(actor)!==identity(author) && providers.some(p=>identity(p.id)===identity(author)&&!p.sus)
export function sendSocialMessage(threads,from,to,body,id) {
  const clean=String(body||'').trim(), a=identity(from), b=identity(to)
  if(!clean||clean.length>1000||!a||!b||a===b) return threads
  const key=pairKey(a,b), previous=threads[key]
  if(previous?.status==='rejected'||(previous?.status==='pending'&&previous.sender!==a))return threads
  if(previous?.status==='pending')return threads
  return {...threads,[key]:{...(previous||{participants:[a,b],sender:a,recipient:b,status:'pending',messages:[]}),messages:[...(previous?.messages||[]),{id,from:a,body:clean}]}}
}
export function decideSocialMessage(threads,key,actor,status){
 const t=threads[key]
 if(!t||t.status!=='pending'||t.recipient!==identity(actor)||!['accepted','rejected'].includes(status))return threads
 return {...threads,[key]:{...t,status}}
}
