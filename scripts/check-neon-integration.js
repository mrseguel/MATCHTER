import { verifyPersistence } from '../server/src/integrationDatabase.js'
try {
  await verifyPersistence()
  console.log('MATCHTER NEON: persistent write/read verified')
} catch {
  // Never print the connection URI, password or database error details.
  console.error('MATCHTER NEON: integration probe failed; check the restricted role, branch, TLS and network access')
  process.exitCode=1
}
