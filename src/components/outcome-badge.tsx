import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { AuditOutcome } from '@/api/types';
import { Badge, type BadgeProps } from '@/components/reui/badge';

const OUTCOMES: Record<AuditOutcome, { label: string; variant: BadgeProps['variant'] }> = {
  answered: { label: 'Answered', variant: 'success-light' },
  'not-covered': { label: 'Not covered', variant: 'warning-light' },
  failed: { label: 'Failed', variant: 'destructive-light' },
};

/** How an exchange ended, in the portal's status colours. With `count`, how many of a conversation's ended so. */
export function OutcomeBadge({
  outcome,
  count,
  children,
}: {
  outcome: AuditOutcome;
  count?: number;
  children?: ReactNode;
}) {
  const { label, variant } = OUTCOMES[outcome];
  return (
    <Badge variant={variant} radius='full' size='lg'>
      {count === undefined ? label : `${count} ${label.toLowerCase()}`}
      {children}
    </Badge>
  );
}

/** An answer the guardrail intervened in. With `count`, how many of a conversation's it did. */
export function GuardrailBadge({ count }: { count?: number }) {
  return (
    <Badge variant='warning-light' radius='full' size='lg' title='The guardrail intervened'>
      <ShieldAlert aria-hidden='true' />
      {count === undefined ? 'Guardrail intervened' : count}
    </Badge>
  );
}
