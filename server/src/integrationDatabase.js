import pg from 'pg'

const { Pool } = pg
export const INTEGRATION_URL_KEY = 'MATCHTER_INTEGRATION_DATABASE_URL'

export function createIntegrationPool(env = process.env, PoolClass = Pool) {
  const value = env[INTEGRATION_URL_KEY]
  if (!value) throw new Error('Integration database is not configured')
  const url = new URL(value)
  if (!['postgresql:', 'postgres:'].includes(url.protocol) ||
      !url.hostname.endsWith('.neon.tech') ||
      url.searchParams.get('sslmode') !== 'require' ||
      url.username !== 'matchter_probe') {
    throw new Error('Expected restricted Neon integration credentials with sslmode=require')
  }
  // Enforce TLS certificate validation; do not allow URI options to override it.
  for (const key of [...url.searchParams.keys()]) {
    if (['sslmode','sslcert','sslkey','sslrootcert','ssl','uselibpqcompat'].includes(key)) url.searchParams.delete(key)
  }
  return new PoolClass({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    max: 1,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 1000,
    statement_timeout: 5000,
    application_name: 'matchter-integration-probe',
  })
}

export async function verifyPersistence(createPool = createIntegrationPool) {
  const writer = createPool()
  let written
  try {
    const result = await writer.query(
      'INSERT INTO matchter_connectivity.probe(probe_key) VALUES ($1) ON CONFLICT (probe_key) DO UPDATE SET checked_at=clock_timestamp() RETURNING checked_at::text AS checked_at',
      ['vercel-integration']
    )
    written = result.rows[0]?.checked_at
    if (!written) throw new Error('Probe write did not return a timestamp')
  } finally {
    await writer.end()
  }
  const reader = createPool()
  try {
    const result = await reader.query('SELECT checked_at::text AS checked_at FROM matchter_connectivity.probe WHERE probe_key=$1', ['vercel-integration'])
    if (result.rows[0]?.checked_at !== written) throw new Error('Probe read does not match committed write')
    return { persisted: true }
  } finally {
    await reader.end()
  }
}
