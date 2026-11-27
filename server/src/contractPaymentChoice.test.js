import test from 'node:test';
import assert from 'node:assert/strict';
import { availableContractModes, validateAvailabilityChange, confirmContractPaymentMode, disputeCapabilities } from './contractPaymentChoice.js';
test('direct mode is default and requires bilateral consent', () => {
  assert.deepEqual(availableContractModes(), ['direct']);
  assert.equal(confirmContractPaymentMode({ clientSelection:'direct', providerSelection:'direct' }), 'direct');
  assert.throws(() => confirmContractPaymentMode({ clientSelection:'direct' }), /Bilateral/);
});
test('protected offerings require verified custody and administrator', () => {
  for (const availability of ['both','protected-only']) {
    assert.throws(() => availableContractModes({ availability }), /custody/);
    assert.throws(() => validateAvailabilityChange({ availability, verifiedCustody:true }), /Administrator/);
    assert.equal(validateAvailabilityChange({ isAdmin:true, availability, verifiedCustody:true }).appliesTo,'new-contracts-only');
  }
});
test('both allows either consensual selection but not mismatch', () => {
  const config = { availability:'both', verifiedCustody:true };
  assert.deepEqual(availableContractModes(config), ['direct','protected']);
  for (const mode of ['direct','protected']) assert.equal(confirmContractPaymentMode({ ...config, clientSelection:mode, providerSelection:mode }),mode);
  assert.throws(() => confirmContractPaymentMode({ ...config, clientSelection:'protected', providerSelection:'direct' }), /Bilateral/);
});
test('restricted settings prevent unavailable modes', () => {
  assert.throws(() => confirmContractPaymentMode({ clientSelection:'protected', providerSelection:'protected' }), /unavailable/);
  assert.throws(() => confirmContractPaymentMode({ availability:'protected-only', verifiedCustody:true, clientSelection:'direct', providerSelection:'direct' }), /unavailable/);
  assert.throws(() => availableContractModes({ availability:'invalid' }), /Unknown/);
});
test('both allow inspection but report alone cannot move money', () => {
  for (const mode of ['direct','protected']) {
    const c=disputeCapabilities(mode);
    assert.equal(c.optionalIndependentInspection,true);
    assert.equal(c.technicalReportAuthorizesTransfer,false);
    assert.equal(c.automaticDeduction,false);
    assert.equal(c.platformWorkMoneyOperations,mode==='protected');
  }
});
