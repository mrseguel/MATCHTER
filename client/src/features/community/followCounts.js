export function getFollowCounts(follows,authorId){
 const id=String(authorId);
 const graph=follows||{};
 const followers=Object.entries(graph).filter(([source,targets])=>source!==id&&Array.isArray(targets)&&targets.some(target=>String(target)===id)).length;
 const following=new Set((Array.isArray(graph[id])?graph[id]:[]).map(String).filter(target=>target!==id)).size;
 return {followers,following};
}
