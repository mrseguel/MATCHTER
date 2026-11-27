// Explicit opt-in to a subset of providers. Default preserves the existing fixture lab.
const supported=Object.freeze(['khipu','mercadopago'])
export function sandboxProviders(providers=supported){
 if(!Array.isArray(providers)||!providers.length||providers.length>supported.length||new Set(providers).size!==providers.length||providers.some(p=>!supported.includes(p)))throw Error('Invalid sandbox provider selection')
 return Object.freeze([...providers])
}
export function sandboxMerchants(merchants,providers){
 const selected=sandboxProviders(providers)
 if(!merchants||!selected.every(p=>typeof merchants[p]==='string'&&/^\d{1,20}$/.test(merchants[p])))throw Error('Invalid sandbox merchants')
 return Object.freeze(Object.fromEntries(selected.map(p=>[p,merchants[p]])))
}
