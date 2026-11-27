import test from 'node:test'
import assert from 'node:assert/strict'
import {validateInspectionAttachment,MAX_INSPECTION_ATTACHMENT_BYTES} from './inspectionAttachment.js'
const input={filename:'informe.pdf',mediaType:'application/pdf',base64:Buffer.from('%PDF-1.7\nDemo').toString('base64')}
test('PDF test payload receives an integrity hash',()=>{
 const f=validateInspectionAttachment(input)
 assert.equal(f.filename,'informe.pdf')
 assert.equal(f.bytes.toString(),'%PDF-1.7\nDemo')
 assert.match(f.sha256,/^[a-f0-9]{64}$/)
})
test('rejects mislabeled content, path names and malformed encoding',()=>{
 for(const v of [{...input,filename:'../informe.pdf'},{...input,filename:'informe.exe'},{...input,mediaType:'image/png'},{...input,base64:'not base64'},{...input,base64:Buffer.from('no PDF').toString('base64')}])assert.throws(()=>validateInspectionAttachment(v),{status:400})
})
test('rejects oversized files',()=>{
 const bytes=Buffer.alloc(MAX_INSPECTION_ATTACHMENT_BYTES+1);bytes.write('%PDF-')
 assert.throws(()=>validateInspectionAttachment({...input,base64:bytes.toString('base64')}),{status:400})
})
