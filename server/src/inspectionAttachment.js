import {createHash} from 'node:crypto'
export const MAX_INSPECTION_ATTACHMENT_BYTES=512000
const fail=message=>{throw Object.assign(new Error(message),{status:400})}
export function validateInspectionAttachment({filename,mediaType,base64}={}){
 if(typeof filename!=='string'||filename.trim().length<1||filename.length>180||/[\\/\x00-\x1f\x7f]/.test(filename))fail('Nombre de archivo no válido')
 if(typeof base64!=='string'||base64.length>Math.ceil(MAX_INSPECTION_ATTACHMENT_BYTES/3)*4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))fail('Archivo no válido o demasiado grande')
 const bytes=Buffer.from(base64,'base64')
 if(!bytes.length||bytes.length>MAX_INSPECTION_ATTACHMENT_BYTES||bytes.toString('base64')!==base64)fail('Archivo no válido o demasiado grande')
 const ext=filename.toLowerCase().split('.').at(-1)
 const valid=mediaType==='application/pdf'&&ext==='pdf'&&bytes.subarray(0,5).toString()==='%PDF-'||mediaType==='image/jpeg'&&['jpg','jpeg'].includes(ext)&&bytes.subarray(0,3).equals(Buffer.from([255,216,255]))||mediaType==='image/png'&&ext==='png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
 if(!valid)fail('Solo se admiten PDF, JPG y PNG compatibles')
 return {filename:filename.trim(),mediaType,bytes,sha256:createHash('sha256').update(bytes).digest('hex')}
}
