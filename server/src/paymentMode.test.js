import test from 'node:test';
import assert from 'node:assert/strict';
import { choosePaymentMode, paymentPlan, PAYMENT_MODE } from './paymentMode.js';

test('new contracts default to direct mode without verified custody', () => {
  assert.equal(choosePaymentMode(), PAYMENT_MODE.DIRECT);
  assert.equal(choosePaymentMode({verifiedCustody:true}), PAYMENT_MODE.PROTECTED);
});
test('direct mode charges only the separate fee; work stages are informational', () => {
  const p = paymentPlan({stageAmounts:[100000, 50000]});
  assert.equal(p.clientSeparateFeeDue,2990);
  assert.equal(p.providerFeeDue,2990);
  assert.equal(p.contractTotal,150000);
  assert.equal(p.clientFirstStageAmount,null);
  assert.equal(p.workPaymentsInformational,true);
  assert.ok(p.stages.every(s=>s.plannedClientAmount===null&&!s.payableThroughPlatform));
});
test('direct mode does not treat a deduction authorization as collected funds', () => {
  const p=paymentPlan({stageAmounts:[100000],clientFeeConfirmed:true,providerDeductionAuthorized:true});
  assert.equal(p.providerCanAuthorizeDeduction,false);
  assert.equal(p.bothFeesConfirmed,false);
});
test('direct mode can proceed when both fees are confirmed', () => {
  const p=paymentPlan({stageAmounts:[100000],clientFeeConfirmed:true,providerFeePaid:true});
  assert.equal(p.clientSeparateFeeDue,0);
  assert.equal(p.providerFeeDue,0);
  assert.equal(p.bothFeesConfirmed,true);
});
test('protected mode bundles the client fee only in the first stage', () => {
  const p=paymentPlan({mode:PAYMENT_MODE.PROTECTED,verifiedCustody:true,stageAmounts:[100000,50000]});
  assert.equal(p.clientSeparateFeeDue,0);
  assert.equal(p.clientFirstStageAmount,102990);
  assert.deepEqual(p.stages.map(s=>s.plannedClientAmount),[102990,50000]);
  assert.equal(p.providerFeeDue,2990);
});
test('protected mode does not add an already confirmed client fee', () => {
  const p=paymentPlan({mode:PAYMENT_MODE.PROTECTED,verifiedCustody:true,stageAmounts:[100000],clientFeeConfirmed:true,providerDeductionAuthorized:true});
  assert.equal(p.clientFirstStageAmount,100000);
  assert.equal(p.bothFeesConfirmed,true);
  assert.equal(p.providerFeeDue,2990);
});
test('protected mode fails closed if custody is unavailable', () => {
  assert.throws(()=>paymentPlan({mode:PAYMENT_MODE.PROTECTED,stageAmounts:[100000]}),/custody/);
});
test('invalid modes and amounts are rejected', () => {
  assert.throws(()=>paymentPlan({mode:'unknown',stageAmounts:[100000]}));
  for (const stageAmounts of [[],[0],[-1],[1.2],[Infinity]]) assert.throws(()=>paymentPlan({stageAmounts}));
});
