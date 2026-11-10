import { initials } from '@/lib/format';

/** A reader as the audit log knows them: their email, or their Cognito `sub` when the token had no email. */
export function ReaderCell({ email, id }: { email?: string; id: string }) {
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary'>
        {initials(email)}
      </span>
      <span className='truncate' title={email ? `${email}\n${id}` : id}>
        {email ?? id}
      </span>
    </span>
  );
}
