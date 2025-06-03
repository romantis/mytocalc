// чисті функції формул
const NO_DUTY_LIMIT = 150;
const MIN_VAT_BASE = 100;

export interface DutyResult {
  duty: number;
  vat: number;
  total: number;
}

export function calcDuty(
  declaredValue: number,      // EUR
  draftLaw = false
): DutyResult {
  if (draftLaw) {
    // draft 2025: VAT from €0, duty still >150
    const duty =
      declaredValue > NO_DUTY_LIMIT
        ? 0.1 * (declaredValue - NO_DUTY_LIMIT)
        : 0;
    const vat = 0.2 * (declaredValue + duty);
    return { duty, vat, total: duty + vat };
  }

  if (declaredValue <= NO_DUTY_LIMIT) return { duty: 0, vat: 0, total: 0 };

  const duty = 0.1 * (declaredValue - NO_DUTY_LIMIT);
  const vatBase = declaredValue - MIN_VAT_BASE + duty;
  const vat = 0.2 * vatBase;
  return { duty, vat, total: duty + vat };
}
