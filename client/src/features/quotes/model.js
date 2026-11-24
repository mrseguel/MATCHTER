// Demo-only deterministic matching. A production AI interpreter must resolve exact canonical scope; it must not guess prices.
export const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'')
export const reference={id:'CYPE-RIP030',service:'Pintura interior de muros de yeso, obra nueva, hasta 3 m, sin patologías, blanco mate, imprimación y dos manos',unit:'m2',price:3341.63,source:'Generador de precios de la construcción, CYPE Chile, RIP030',url:'https://chile.generadordeprecios.info/obra_nueva/Revestimientos/Pinturas_en_paramentos_interiores/Plasticas/RIP030_Pintura_plastica_sobre_paramento_in.html',checked:'2026-11-24',zone:'Chile, sin ajuste verificado a Temuco',scope:'Costos directos: materiales, mano de obra y herramientas. No es precio de venta ni cotización final; no incluye cálculo de gastos generales, utilidad o impuestos.',sample:'Un análisis de costo unitario; no es una muestra de precios de mercado.',confidence:'Limitada para precios de contratación locales'}
export function parseDescription(input){
 const s=norm(input).replace(/m²/g,'m2')
 const match=s.match(/^([0-9]+(?:[.,][0-9]+)?)\s*m2\s+(?:de\s+)?(.+)$/)
 return match?{service:match[2],unit:'m2',quantity:Number(match[1].replace(',','.'))}:{service:s,unit:'servicio',quantity:1}
}
export function estimate(description,zone,entries,profiles,refs=[reference]){
 const q=parseDescription(description), area=norm(zone)
 if(!q.service||!area||!Number.isFinite(q.quantity)||q.quantity<=0||q.quantity>100000)return {kind:'invalid'}
 const candidates=entries.filter(x=>norm(x.service)===q.service&&x.unit===q.unit&&norm(x.zone)===area&&Number.isFinite(x.price)&&x.price>0&&profiles.some(p=>String(p.id)===String(x.ownerId)&&!p.sus))
 if(candidates.length)return {kind:'internal',q,items:candidates.map(x=>({...x,total:Math.round(x.price*q.quantity)}))}
 const ref=refs.find(x=>norm(x.service)===q.service&&x.unit===q.unit&&['temuco','chile'].includes(area)&&Number.isFinite(x.price)&&x.price>0)
 if(ref)return {kind:'external',q,ref,total:Math.round(ref.price*q.quantity)}
 return {kind:'unavailable',q}
}
export function addOffer(entries,actor,offer){
 if(!actor||!norm(offer.service)||!norm(offer.zone)||!['m2','servicio'].includes(offer.unit)||!Number.isFinite(offer.price)||offer.price<=0)return entries
 return [...entries.filter(x=>!(String(x.ownerId)===String(actor.id)&&norm(x.service)===norm(offer.service)&&x.unit===offer.unit&&norm(x.zone)===norm(offer.zone))),{...offer,ownerId:String(actor.id),demo:true}]
}
