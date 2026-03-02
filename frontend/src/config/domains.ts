/**
 * Single source of truth for the three app domains.
 * Used for Healthcare vs PayLedger landing, support email, and branding.
 * Keep in sync with backend CORS (APP_ORIGINS in security.middleware.ts).
 *
 * advancia-healthcare.com = personal (individuals/patients, personal folder).
 * advanciapayledger.com = primary app + business/professional.
 */

export const HEALTHCARE_HOSTNAMES = [
  'advancia-healthcare.com',
  'www.advancia-healthcare.com',
] as const;

export function isHealthcareHost(hostname: string): boolean {
  return HEALTHCARE_HOSTNAMES.includes(hostname as (typeof HEALTHCARE_HOSTNAMES)[number]);
}

export function getSupportEmail(hostname: string): string {
  return isHealthcareHost(hostname)
    ? 'support@advancia-healthcare.com'
    : 'support@advanciapayledger.com';
}

/** Primary signup domain (one account system); Healthcare CTAs can link here */
export const SIGNUP_ORIGIN = 'https://advanciapayledger.com';
