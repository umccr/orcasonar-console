import { useEffect } from 'react';
import { CircleAlert, Compass, LogIn, ServerOff } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { useAuth, type AuthState } from '@/auth/auth-context';
import { Logo } from '@/components/logo';
import { StageBadge } from '@/components/stage-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className='flex min-h-svh items-center justify-center bg-background p-6'>{children}</div>
);

/** Asks the reader to sign in, with their UMCCR Google account through the portal's Cognito pool. */
export function SignInPage({
  reason,
}: {
  reason?: Extract<AuthState, { status: 'signed-out' }>['reason'];
}) {
  const { signIn } = useAuth();
  return (
    <Centered>
      <Card className='w-full max-w-sm items-center gap-5 px-8 py-10 text-center'>
        <Logo className='size-12' />
        <div className='space-y-1'>
          <h1 className='text-xl font-bold tracking-tight'>OrcaSonar Console</h1>
          <p className='text-muted-foreground'>
            OrcaSonar&apos;s usage and audit log, and playgrounds to try its chat and search.
          </p>
        </div>
        {reason && (
          <Alert variant={reason === 'failed' ? 'destructive' : 'default'} className='text-start'>
            <AlertDescription>
              {reason === 'expired'
                ? 'Your session has ended. Sign in again to carry on.'
                : "Signing in didn't finish. Try again."}
            </AlertDescription>
          </Alert>
        )}
        <Button size='lg' className='w-full' onClick={() => void signIn()}>
          <LogIn />
          Sign in with Google
        </Button>
        <p className='text-xs text-muted-foreground'>Use your UMCCR Google account.</p>
        <StageBadge />
      </Card>
    </Centered>
  );
}

export function SigningIn() {
  return (
    <Centered>
      <div className='flex items-center gap-2 text-muted-foreground'>
        <Spinner />
        Signing you in…
      </div>
    </Centered>
  );
}

/** For a host the console has no OrcaSonar for, such as the portal in staging. */
export function UnsupportedHost() {
  return (
    <Centered>
      <Empty className='max-w-md border bg-card'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <ServerOff />
          </EmptyMedia>
          <EmptyTitle>OrcaSonar doesn&apos;t run here</EmptyTitle>
          <EmptyDescription>
            {window.location.hostname} has no OrcaSonar. The console runs on portal.dev.umccr.org
            and portal.umccr.org.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Centered>
  );
}

/** For a deployed console whose env.js lacks sign-in settings, which the portal pipeline writes at deploy. */
export function MissingSignInSettings({ names }: { names: readonly string[] }) {
  useEffect(() => {
    console.error(`OrcaSonar Console: env.js lacks ${names.join(', ')}; sign-in is off.`);
  }, [names]);
  return (
    <Centered>
      <Empty className='max-w-md border bg-card'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <CircleAlert />
          </EmptyMedia>
          <EmptyTitle>Sign-in isn&apos;t set up here</EmptyTitle>
          <EmptyDescription>
            This page&apos;s <code>env.js</code> lacks {names.join(', ')}. The portal pipeline
            writes it when the console deploys; deploying again, or running the stage&apos;s env
            config Lambda, puts it back.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Centered>
  );
}

export function NotFoundPage() {
  return (
    <Empty className='m-6'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <Compass />
        </EmptyMedia>
        <EmptyTitle>No such page</EmptyTitle>
        <EmptyDescription>The console has Usage, the Audit log, Chat and Search.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to='/' className={buttonVariants()}>
          Go to Usage
        </Link>
      </EmptyContent>
    </Empty>
  );
}

/** For an error a page threw while rendering. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);
  return (
    <Centered>
      <Empty className='max-w-md border bg-card'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <CircleAlert />
          </EmptyMedia>
          <EmptyTitle>This page stopped working</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </EmptyContent>
      </Empty>
    </Centered>
  );
}
