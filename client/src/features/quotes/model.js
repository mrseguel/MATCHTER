// Demo-only deterministic matching. A production AI interpreter must resolve exact canonical scope; it must not guess prices.
export const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'')
export const reference={id:'FACTOIA-2026-PINTURA',service:'Pintura interior de muros con materiales y preparación media',unit:'m2',min:5500,max:11000,source:'factoIA · guía de precios de pintura interior, 20 abril 2026',url:'https://factoia.cl/blog/precio-metro-cuadrado-pintura-chile/',checked:'2026-11-24',zone:'Chile · no es una muestra representativa de Temuco',scope:'Pintura, mano de obra y preparación media. No cubre reparaciones mayores, humedad ni condiciones especiales; impuestos y mínimos de visita deben confirmarse.',sample:'Rango publicado en una guía comercial; tamaño de muestra no informado.',confidence:'Orientativa; requiere cotización local.'}
export const laborReference={...reference,id:'FACTOIA-2026-MANO-OBRA',service:'Pintura interior de muros solo mano de obra',min:2800,max:5500,scope:'Solo mano de obra; no incluye pintura ni otros materiales. Confirmar preparación, impuestos y mínimos.'}
export const demoOffers=[
 {ownerId:'1',service:reference.service,zone:'Temuco',unit:'m2',price:9500,scope:'Dos manos de látex, preparación media, protección y materiales. Valor total ilustrativo; sin reparaciones mayores.',date:'2026-11-24',demo:true,seed:true},
 {ownerId:'6',service:reference.service,zone:'Temuco',unit:'m2',price:10500,scope:'Preparación media, dos manos, pintura lavable y materiales. Valor total ilustrativo; sin reparación de humedad.',date:'2026-11-24',demo:true,seed:true},
 {ownerId:'1',service:laborReference.service,zone:'Temuco',unit:'m2',price:4800,scope:'Solo mano de obra, dos manos sobre muros preparados. Materiales a cargo del cliente.',date:'2026-11-24',demo:true,seed:true}
]
export function parseDescription(input){
 const s=norm(input).replace(/m²/g,'m2')
 const match=s.match(/^([0-9]+(?:[.,][0-9]+)?)\s*m2\s+(?:de\s+)?(.+)$/)
 return match?{service:match[2],unit:'m2',quantity:Number(match[1].replace(',','.'))}:{service:s,unit:'servicio',quantity:1}
}
export function estimate(description,zone,entries,profiles,refs=[reference,laborReference]){
 const q=parseDescription(description), area=norm(zone)
 if(!q.service||!area||!Number.isFinite(q.quantity)||q.quantity<=0||q.quantity>100000)return {kind:'invalid'}
 const candidates=entries.filter(x=>norm(x.service)===q.service&&x.unit===q.unit&&norm(x.zone)===area&&Number.isFinite(x.price)&&x.price>0&&profiles.some(p=>String(p.id)===String(x.ownerId)&&!p.sus))
 const ref=refs.find(x=>norm(x.service)===q.service&&x.unit===q.unit&&['temuco','chile'].includes(area)&&Number.isFinite(x.min)&&Number.isFinite(x.max)&&x.min>0&&x.max>=x.min)
 const external=ref?{ref,minTotal:Math.round(ref.min*q.quantity),maxTotal:Math.round(ref.max*q.quantity)}:null
 if(candidates.length)return {kind:'internal',q,items:candidates.map(x=>({...x,total:Math.round(x.price*q.quantity)})),external}
 if(external)return {kind:'external',q,...external}
 return {kind:'unavailable',q}
}
export function addOffer(entries,actor,offer){
 if(!actor||!norm(offer.service)||!norm(offer.zone)||!['m2','servicio'].includes(offer.unit)||!Number.isFinite(offer.price)||offer.price<=0)return entries
 return [...entries.filter(x=>!(String(x.ownerId)===String(actor.id)&&norm(x.service)===norm(offer.service)&&x.unit===offer.unit&&norm(x.zone)===norm(offer.zone))),{...offer,ownerId:String(actor.id),demo:true}]
}
