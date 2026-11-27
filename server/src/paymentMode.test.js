import test from 'node:test';
import assert from 'node:assert/strict';
import { choosePaymentMode, paymentPlan, PAYMENT_MODE, validateAdminPaymentModeChange } from './paymentMode.js';

test('new contracts default to direct mode without verified custody', () => {
  assert.equal(choosePaymentMode(), PAYMENT_MODE.DIRECT);
  assert.equal(choosePaymentMode({verifiedCustody:true}), PAYMENT_MODE.DIRECT);
  assert.equal(choosePaymentMode({selectedMode:PAYMENT_MODE.PROTECTED,verifiedCustody:true}), PAYMENT_MODE.PROTECTED);
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

test('only an administrator can change the selected mode', () => {
  assert.throws(()=>validateAdminPaymentModeChange({requestedMode:PAYMENT_MODE.DIRECT}),/Administrator/);
});
test('admin cannot activate protection without a verified integration', () => {
  assert.throws(()=>validateAdminPaymentModeChange({isAdmin:true,requestedMode:PAYMENT_MODE.PROTECTED}),/custody/);
});
test('administrator can choose either mode after verification; existing contracts remain unchanged', () => {
  const enabled=validateAdminPaymentModeChange({isAdmin:true,requestedMode:PAYMENT_MODE.PROTECTED,verifiedCustody:true});
  assert.deepEqual(enabled,{selectedMode:'protected',previousMode:'direct',changed:true,appliesTo:'new-contracts-only'});
  const disabled=validateAdminPaymentModeChange({isAdmin:true,currentMode:'protected',requestedMode:'direct'});
  assert.equal(disabled.selectedMode,'direct');
  assert.equal(disabled.appliesTo,'new-contracts-only');
});

test('physical progress, evidence, delivery and acceptance remain enabled in both modes', () => {
  const direct=paymentPlan({stageAmounts:[40000,60000]});
  const protectedPlan=paymentPlan({mode:PAYMENT_MODE.PROTECTED,verifiedCustody:true,stageAmounts:[40000,60000]});
  for (const plan of [direct,protectedPlan]) {
    for (const key of ['enabled','progressReporting','evidence','deliveryReporting','acceptanceAndCloseout']) assert.equal(plan.stageTracking[key],true);
    assert.deepEqual(plan.stages.map(s=>[s.stageNo,s.contractAmount]),[[1,40000],[2,60000]]);
  }
  assert.equal(direct.stageTracking.financialCustody,false);
  assert.equal(direct.stageTracking.financialRelease,false);
  assert.equal(protectedPlan.stageTracking.financialCustody,true);
  assert.equal(protectedPlan.stageTracking.financialRelease,true);
});

test('payment mode preserves the fee quoted by the existing role-based tariff policy', () => {
  const direct=paymentPlan({stageAmounts:[100000],feeAmount:4990});
  assert.equal(direct.clientSeparateFeeDue,4990);
  assert.equal(direct.providerFeeDue,4990);
  const protectedPlan=paymentPlan({mode:PAYMENT_MODE.PROTECTED,verifiedCustody:true,stageAmounts:[100000],feeAmount:9990});
  assert.equal(protectedPlan.clientFirstStageAmount,109990);
  assert.throws(()=>paymentPlan({stageAmounts:[100000],feeAmount:0}));
});
