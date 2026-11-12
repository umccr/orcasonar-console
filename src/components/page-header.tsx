import type { ReactNode } from 'react';
import { Info, type LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenu } from './user-menu';

/** A page's title row: its icon and name, an "info" note, the page's own actions, and the reader's menu. */
export function PageHeader({
  icon: Icon,
  title,
  info,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  info?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className='flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-5 pb-4 sm:px-6'>
      <SidebarTrigger className='-ms-1 md:hidden' />
      <Icon className='size-6 shrink-0 text-foreground/70' aria-hidden='true' />
      <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
      {info && (
        <Popover>
          <PopoverTrigger className='inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50'>
            <Info className='size-3.5' aria-hidden='true' />
            info
          </PopoverTrigger>
          <PopoverContent align='start' className='w-96 max-w-[calc(100vw-2rem)]'>
            <PopoverHeader>
              <PopoverTitle>{title}</PopoverTitle>
            </PopoverHeader>
            <div className='space-y-2 text-muted-foreground'>{info}</div>
          </PopoverContent>
        </Popover>
      )}
      <div className='ms-auto flex items-center gap-2'>
        {actions}
        {actions && <Separator orientation='vertical' className='mx-1 h-6' />}
        <UserMenu />
      </div>
    </header>
  );
}
