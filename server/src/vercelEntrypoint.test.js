import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import handler from '../../api/index.js'

test('Vercel API entrypoint serves health and dashboard through rewrite', async () => {
  const server = createServer(handler)
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve) })
  try {
    const origin = 'http://127.0.0.1:' + server.address().port
    for (const path of ['/api/health','/api/index?__matchter_path=health']) {
      const result = await fetch(origin+path)
      assert.equal(result.status,200)
      assert.equal((await result.json()).status,'ok')
    }
    const result = await fetch(origin+'/api/index?__matchter_path=dashboard')
    assert.equal(result.status,200)
    assert.equal((await result.json()).persistence,'memory-demo')
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})
