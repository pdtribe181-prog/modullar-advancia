export const icd10Codes: Record<string, string> = {
  'annual physical': 'Z00.00',
  hypertension: 'I10',
  diabetes: 'E11.9',
  'chest pain': 'R07.9',
  headache: 'R51.9',
  'back pain': 'M54.5',
  anxiety: 'F41.9',
  depression: 'F32.9',
  asthma: 'J45.909',
};

export const defaultFraudResponse = {
  riskLevel: 'LOW',
  riskScore: 15,
  analysis: 'Transaction appears consistent with normal healthcare billing patterns.',
  flags: [],
  recommendations: [
    'Transaction within normal parameters',
    'Provider billing history consistent',
    'No geographic anomalies detected',
    'Amount within expected range for procedure type',
  ],
};
