import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useAuth, useReader } from '@/auth/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initials } from '@/lib/format';
import { API_STAGE } from '@/lib/stage';
import { useTheme, type Theme } from './theme-context';

const THEMES: readonly {
  readonly value: Theme;
  readonly label: string;
  readonly icon: typeof Sun;
}[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const isTheme = (value: unknown): value is Theme => THEMES.some((theme) => theme.value === value);

/** The signed-in reader, the theme, and signing out. */
export function UserMenu() {
  const { state, signOut } = useAuth();
  const reader = useReader();
  const { theme, setTheme } = useTheme();
  const name = reader?.name ?? reader?.email ?? 'Signed in';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='ghost' className='h-9 gap-2.5 px-1.5' aria-label='Account' />}
      >
        <span className='hidden max-w-48 truncate text-sm font-medium sm:inline'>{name}</span>
        <span className='flex size-8 items-center justify-center rounded-full bg-linear-to-br from-orange-400 to-pink-500 text-xs font-semibold text-white'>
          {initials(reader?.email)}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='grid gap-0.5 font-normal'>
            <span className='truncate font-medium text-foreground'>{name}</span>
            {reader?.email && reader.email !== name && (
              <span className='truncate text-xs text-muted-foreground'>{reader.email}</span>
            )}
            {state.status === 'local' && (
              <span className='text-xs text-muted-foreground'>
                {API_STAGE === 'local'
                  ? 'The local API answers as this reader'
                  : 'make start signs in through dev Cognito'}
              </span>
            )}
            {reader && reader.groups.length > 0 && (
              <span className='truncate text-xs text-muted-foreground'>
                Groups: {reader.groups.join(', ')}
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className='text-xs text-muted-foreground'>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value: unknown) => {
              if (isTheme(value)) {
                setTheme(value);
              }
            }}
          >
            {THEMES.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {state.status === 'signed-in' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => void signOut()}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
