import test from 'node:test'
import {selfTest} from '../../scripts/khipu-sandbox-probe.mjs'
test('Khipu read-only probe rejects invalid, mixed and non-demo bank responses',selfTest)
