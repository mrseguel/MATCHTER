// Preview-only: never authenticate real accounts here.
const accounts=new Map();
export const roles=['Perfil clientes','Perfil maestros','Profesionales y contratistas','Perfil empresas'];
const clean=v=>String(v??'').trim();
export const normalise=v=>clean(v).toLowerCase();
export function validRut(value){
 const rut=clean(value).replace(/[.\-\s]/g,'').toUpperCase();
 if(!/^\d{7,8}[0-9K]$/.test(rut))return false;
 let sum=0,m=2;const body=rut.slice(0,-1);
 for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*m;m=m===7?2:m+1}
 const d=11-sum%11;return rut.slice(-1)===(d===11?'0':d===10?'K':String(d));
}
export function validateRegistration(input){
 const type=input.type,company=type==='Perfil empresas',email=normalise(input.email);
 if(!roles.includes(type))throw Error('Selecciona tu tipo de perfil.');
 const firstName=company?'':clean(input.firstName),lastName=company?'':clean(input.lastName),companyName=company?clean(input.companyName):'';
 if(company?(!companyName||companyName.length>150):(!firstName||!lastName||firstName.length>80||lastName.length>80))throw Error(company?'Ingresa el nombre o razón social de la empresa.':'Ingresa tu nombre y apellidos.');
 const legalRepresentative=company?clean(input.legalRepresentative):'',companyRut=company?clean(input.companyRut):'',representativeRut=company?clean(input.representativeRut):'';
 if(companyRut&&!validRut(companyRut))throw Error('Revisa el RUT de la empresa.');
 if(representativeRut&&!validRut(representativeRut))throw Error('Revisa el RUT del representante legal.');
 if(legalRepresentative.length>150)throw Error('Revisa el nombre del representante legal.');
 if(!/^[^\s@]+@example\.test$/.test(email)||email.length>254)throw Error('Usa un correo ficticio terminado en @example.test.');
 if(typeof input.password!=='string'||input.password.length<10||input.password.length>128)throw Error('Usa una contraseña de prueba de 10 a 128 caracteres.');
 if(input.password!==input.confirm)throw Error('Las contraseñas no coinciden.');
 if(accounts.has(email))throw Error('Este correo ya está registrado en esta prueba.');
 const phone=clean(input.phone),city=clean(input.city),sector=clean(input.sector),address=clean(input.address);
 if(phone&&!/^\+?[0-9\s()\-]{7,20}$/.test(phone))throw Error('Revisa el número de teléfono.');
 if([city,sector].some(v=>v.length>100)||address.length>180)throw Error('Revisa la longitud de los datos de ubicación.');
 return {name:company?companyName:firstName+' '+lastName,type,email,firstName,lastName,companyName,legalRepresentative,companyRut,representativeRut,phone,city,sector,address};
}
async function digest(password,salt){
 const bytes=new TextEncoder().encode(salt+':'+password);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function registerTest(input){
 const user=validateRegistration(input),salt=crypto.randomUUID(),hash=await digest(input.password,salt);
 validateRegistration(input);accounts.set(user.email,{...user,salt,hash});return user;
}
export async function loginTest(email,password){
 const user=accounts.get(normalise(email));
 if(!user||typeof password!=='string'||await digest(password,user.salt)!==user.hash)throw Error('Correo electrónico o contraseña incorrectos.');
 const {hash,salt,...safe}=user;return safe;
}
