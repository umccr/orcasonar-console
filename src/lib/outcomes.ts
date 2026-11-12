import type { AuditOutcome } from '@/api/types';

export const OUTCOME_LABELS: Record<AuditOutcome, string> = {
  answered: 'Answered',
  'not-covered': 'Not covered',
  failed: 'Failed',
};

export const isOutcome = (value: string | null | undefined): value is AuditOutcome =>
  value === 'answered' || value === 'not-covered' || value === 'failed';
