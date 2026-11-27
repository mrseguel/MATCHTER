// Pure payment planning. This module never creates charges, marks fees paid, or moves money.
export const PAYMENT_MODE = Object.freeze({ DIRECT: 'direct', PROTECTED: 'protected' });
export const BASE_FEE_CLP = 2990;

// Called on the server only, from verified provider configuration (never client input).
// Persist the returned mode on NEW contracts; existing contracts require explicit migration.
export function choosePaymentMode({ selectedMode = PAYMENT_MODE.DIRECT, verifiedCustody = false } = {}) {
  if (!Object.values(PAYMENT_MODE).includes(selectedMode)) throw new Error('Unknown payment mode');
  if (selectedMode === PAYMENT_MODE.PROTECTED && verifiedCustody !== true) throw new Error('Verified custody unavailable');
  return selectedMode;
}

// Authorization inputs must come from the authenticated server session and verified
// integration status, not from the administrator's request body. Persistence and audit
// of the change belong to the future administrator endpoint.
export function validateAdminPaymentModeChange({ isAdmin = false, currentMode = PAYMENT_MODE.DIRECT,
  requestedMode, verifiedCustody = false } = {}) {
  if (isAdmin !== true) throw new Error('Administrator required');
  if (!Object.values(PAYMENT_MODE).includes(currentMode) ||
      !Object.values(PAYMENT_MODE).includes(requestedMode)) throw new Error('Unknown payment mode');
  const selectedMode = choosePaymentMode({ selectedMode: requestedMode, verifiedCustody });
  return { selectedMode, previousMode: currentMode, changed: currentMode !== selectedMode,
    appliesTo: 'new-contracts-only' };
}

export function paymentPlan({ mode = PAYMENT_MODE.DIRECT, stageAmounts, clientFeeConfirmed = false,
  providerFeePaid = false, providerDeductionAuthorized = false, verifiedCustody = false } = {}) {
  if (!Object.values(PAYMENT_MODE).includes(mode)) throw new Error('Unknown payment mode');
  if (!Array.isArray(stageAmounts) || !stageAmounts.length || stageAmounts.some(n => !Number.isSafeInteger(n) || n <= 0)) throw new Error('Invalid stage amounts');
  const total = stageAmounts.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total + BASE_FEE_CLP)) throw new Error('Invalid total');
  const protectedMode = mode === PAYMENT_MODE.PROTECTED;
  // Fail closed: a protected contract cannot silently switch to direct settlement.
  if (protectedMode && verifiedCustody !== true) throw new Error('Verified custody unavailable');
  const clientFeeDue = clientFeeConfirmed ? 0 : BASE_FEE_CLP;
  const providerFeeDue = providerFeePaid ? 0 : BASE_FEE_CLP;
  const canDeduct = protectedMode && stageAmounts.some(n => n >= BASE_FEE_CLP);
  const providerReady = providerFeePaid || (canDeduct && providerDeductionAuthorized === true);
  return {
    mode, currency: 'CLP', contractTotal: total, baseFee: BASE_FEE_CLP,
    workPaymentsInformational: !protectedMode,
    // Physical execution and contractual milestones are independent of fund custody.
    stageTracking: {
      enabled: true, progressReporting: true, evidence: true,
      deliveryReporting: true, acceptanceAndCloseout: true,
      financialCustody: protectedMode,
      financialRelease: protectedMode
    },
    clientSeparateFeeDue: protectedMode ? 0 : clientFeeDue,
    // Scheduled amount, not a charge authorization or a claim that the stage is unpaid.
    clientFirstStageAmount: protectedMode ? stageAmounts[0] + clientFeeDue : null,
    providerFeeDue, providerCanAuthorizeDeduction: canDeduct,
    providerReady, bothFeesConfirmed: clientFeeConfirmed === true && providerReady,
    stages: stageAmounts.map((amount, index) => ({
      stageNo: index + 1, contractAmount: amount, payableThroughPlatform: protectedMode,
      plannedClientAmount: protectedMode ? amount + (index === 0 ? clientFeeDue : 0) : null
    }))
  };
}
