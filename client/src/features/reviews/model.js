const demoIds=new Set(['1','2','3','4','5','6','demo-client','client-rodrigo','client-sebastian']);
const positiveClient=['Buena comunicación durante el trabajo.','Coordinación clara de los horarios.','Explicó bien las necesidades del proyecto.','Trato respetuoso y cordial.'];
const positiveProvider=['Buena comunicación durante el proyecto.','Trabajos realizados con cuidado y orden.','Explicó claramente el alcance de los trabajos.','Buena disposición para resolver consultas.'];
export function demoReviews(person){
 if(!demoIds.has(String(person?.id))||!Number.isInteger(person?.n)||person.n<1||!Number.isFinite(person?.r)||person.r<1||person.r>5)return [];
 const count=person.n,units=Math.round(person.r*2*count),base=Math.floor(units/count),remainder=units-base*count;
 return Array.from({length:count},(_,i)=>{const score=(base+(i<remainder?1:0))/2,client=person.role==='Cliente';const comments=client?positiveClient:positiveProvider;
 return {id:String(person.id)+'-review-'+(i+1),reviewer:(client?'Profesional de prueba ':'Cliente de prueba ')+String(i+1).padStart(2,'0'),score,date:new Date(Date.UTC(2026,10,20-i)).toISOString().slice(0,10),comment:i%5===4?'':score<4.5?'Se puede mejorar la coordinación de algunos detalles.':comments[i%comments.length],demo:true};
 });
}
export const average=items=>items.length?items.reduce((a,r)=>a+r.score,0)/items.length:null;
