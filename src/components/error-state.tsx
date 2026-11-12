import type { ReactNode } from 'react';
import { CircleAlert, Clock, Lock, LogIn, PlugZap, SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { isApiError } from '@/api/errors';
import { useAuth } from '@/auth/auth-context';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { describeError } from '@/lib/describe-error';
import { cn } from '@/lib/utils';

const iconFor = (error: unknown): ReactNode => {
  if (!isApiError(error)) {
    return <CircleAlert />;
  }
  switch (error.code) {
    case 'network':
      return <PlugZap />;
    case 'unauthorized':
      return <LogIn />;
    case 'forbidden':
      return <Lock />;
    case 'not-found':
      return <SearchX />;
    case 'over-budget':
    case 'throttled':
      return <Clock />;
    default:
      return <CircleAlert />;
  }
};

/** A request that failed, in place of what it was for, with a way to try again. */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const { state, signIn } = useAuth();
  const unauthorized = isApiError(error) && error.status === 401;
  const canSignIn = unauthorized && state.status !== 'local';
  // Run without sign-in, the console has no token for an API that wants one, such as OrcaSonar dev.
  const { title, description } =
    unauthorized && state.status === 'local'
      ? {
          title: 'This API needs you signed in',
          description: (
            <>
              The console is running without sign-in. Start it with <code>make start</code>, which
              signs in through dev Cognito, to call OrcaSonar dev.
            </>
          ),
        }
      : describeError(error);
  return (
    <Empty className={cn('border-0', className)}>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{iconFor(error)}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {(onRetry || canSignIn) && (
        <EmptyContent>
          {canSignIn ? (
            <Button size='sm' onClick={() => void signIn()}>
              Sign in again
            </Button>
          ) : (
            <Button variant='outline' size='sm' onClick={onRetry}>
              Try again
            </Button>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
}

/** In place of an audit page, for a reader outside the audit group (in prod, `admin`). */
export function AuditForbidden() {
  return (
    <Empty className='mx-4 my-6 border bg-card sm:mx-6'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <Lock />
        </EmptyMedia>
        <EmptyTitle>The audit pages are for the admin group</EmptyTitle>
        <EmptyDescription>
          OrcaSonar shows usage and the audit log to members of the portal&apos;s admin group. The
          Chat and Search playgrounds are open to you.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to='/chat' className={buttonVariants()}>
          Go to Chat
        </Link>
      </EmptyContent>
    </Empty>
  );
}
