import {createSandboxPaymentAttempts} from './sandboxPaymentAttempts.js'
import {createSandboxReconciliation} from './sandboxPaymentReconciliation.js'
import {createSandboxProviderTransport} from './sandboxProviderTransport.js'
import {createSandboxPaymentWorker} from './sandboxPaymentWorker.js'
import {createSandboxNotificationInbox} from './sandboxNotificationInbox.js'
import {createSandboxNotificationRouter} from './sandboxNotificationRouter.js'
import {createSandboxNotificationDrain} from './sandboxNotificationDrain.js'
// Single composition root for CI with the existing isolated database and injected
// fixture HTTP. No process.env credentials, automatic global fetch or live mounting.
export function createSandboxPaymentLab({mode,db,verifyIdentity,credentials,fixtureFetch,origin}={}){
 if(mode!=='isolated_test'||typeof fixtureFetch!=='function'||fixtureFetch===globalThis.fetch||typeof verifyIdentity!=='function'||typeof db?.query!=='function'||typeof db?.connect!=='function')throw Error('Isolated payment laboratory required')
 const u=new URL(origin)
 if(u.protocol!=='https:'||u.href!==u.origin+'/'||!u.hostname.endsWith('.invalid'))throw Error('Only reserved laboratory domains allowed')
 const merchants=Object.freeze({khipu:credentials?.khipu?.merchantId,mercadopago:credentials?.mercadopago?.merchantId})
 const options={mode,db,verifyIdentity,merchants}
 const attempts=createSandboxPaymentAttempts(options)
 const reconciliation=createSandboxReconciliation(options)
 const transport=createSandboxProviderTransport({mode,credentials,fetchImpl:fixtureFetch,origin:u.origin})
 const worker=createSandboxPaymentWorker({...options,attempts,reconciliation,transport})
 const inbox=createSandboxNotificationInbox({...options,worker,transport,credentials})
 const router=createSandboxNotificationRouter({mode,host:u.host,inbox})
 const drain=createSandboxNotificationDrain({mode,inbox})
 return Object.freeze({attempts,reconciliation,transport,worker,inbox,router,drain,environment:'sandbox',realPaymentsEnabled:false})
}
