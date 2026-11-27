// Policy for new contracts only. No financial operations are performed here.
import { PAYMENT_MODE, choosePaymentMode } from './paymentMode.js';
export const PAYMENT_AVAILABILITY = Object.freeze({ DIRECT_ONLY: 'direct-only', BOTH: 'both', PROTECTED_ONLY: 'protected-only' });
export function availableContractModes({ availability = PAYMENT_AVAILABILITY.DIRECT_ONLY, verifiedCustody = false } = {}) {
  if (!Object.values(PAYMENT_AVAILABILITY).includes(availability)) throw new Error('Unknown payment availability');
  if (availability !== PAYMENT_AVAILABILITY.DIRECT_ONLY && verifiedCustody !== true) throw new Error('Verified custody unavailable');
  if (availability === PAYMENT_AVAILABILITY.BOTH) return [PAYMENT_MODE.DIRECT, PAYMENT_MODE.PROTECTED];
  return [availability === PAYMENT_AVAILABILITY.DIRECT_ONLY ? PAYMENT_MODE.DIRECT : PAYMENT_MODE.PROTECTED];
}
export function validateAvailabilityChange({ isAdmin = false, availability, verifiedCustody = false } = {}) {
  if (isAdmin !== true) throw new Error('Administrator required');
  if (!availability) throw new Error('Payment availability required');
  return { availability, modes: availableContractModes({ availability, verifiedCustody }), appliesTo: 'new-contracts-only' };
}
// Settings and custody readiness come from the server; selections are independently
// authenticated and bound to the same final quote/contract revision before this call.
export function confirmContractPaymentMode({ availability, verifiedCustody = false, clientSelection, providerSelection } = {}) {
  const modes = availableContractModes({ availability, verifiedCustody });
  if (!modes.includes(clientSelection)) throw new Error('Payment mode unavailable');
  if (providerSelection !== clientSelection) throw new Error('Bilateral agreement required');
  return choosePaymentMode({ selectedMode: clientSelection, verifiedCustody });
}
// Inspection is optional in both modes, not an authorization to debit funds.
export function disputeCapabilities(mode) {
  if (!Object.values(PAYMENT_MODE).includes(mode)) throw new Error('Unknown payment mode');
  return { mediation: true, optionalIndependentInspection: true, evidenceExport: true,
    platformWorkMoneyOperations: mode === PAYMENT_MODE.PROTECTED,
    technicalReportAuthorizesTransfer: false, automaticDeduction: false };
}
