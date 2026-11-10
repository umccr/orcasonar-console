import { ChartColumn, ClipboardList, MessageSquare, Search, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { useApiStatus } from '@/api/api-status';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { API_BASE_URL, API_HOST } from '@/lib/stage';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { StageBadge } from './stage-badge';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

const NAV: readonly { readonly label: string; readonly items: readonly NavItem[] }[] = [
  {
    label: 'Audit',
    items: [
      { to: '/', label: 'Usage', icon: ChartColumn },
      { to: '/audit', label: 'Audit log', icon: ClipboardList },
    ],
  },
  {
    label: 'Playground',
    items: [
      { to: '/chat', label: 'Chat', icon: MessageSquare },
      { to: '/search', label: 'Search', icon: Search },
    ],
  },
];

const isActive = (pathname: string, to: string) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);

export function AppSidebar() {
  const { pathname } = useLocation();
  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='h-16 justify-center border-b border-sidebar-border px-3'>
        <div className='flex items-center gap-2.5 overflow-hidden'>
          <Logo className='group-data-[collapsible=icon]:size-8' />
          <div className='grid leading-tight group-data-[collapsible=icon]:hidden'>
            <span className='text-[15px] font-bold tracking-tight text-foreground'>OrcaSonar</span>
            <span className='text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase'>
              Console
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className='pt-3'>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className='text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase'>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={isActive(pathname, item.to)}
                      tooltip={item.label}
                      className='h-9 text-[14px]'
                      render={<NavLink to={item.to} end={item.to === '/'} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className='border-t border-sidebar-border'>
        <ApiStatusLine />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

const STATUS = {
  unknown: { label: 'API', dot: 'bg-muted-foreground/40' },
  ok: { label: 'API ok', dot: 'bg-success' },
  unreachable: { label: 'API unreachable', dot: 'bg-destructive' },
} as const;

/** Whether OrcaSonar answered the console's last request, the API's host, and the stage. */
function ApiStatusLine() {
  const status = STATUS[useApiStatus()];
  return (
    <div className='flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'>
      <span className='flex min-w-0 items-center gap-1.5' title={API_BASE_URL}>
        <span className={cn('size-2 shrink-0 rounded-full', status.dot)} />
        <span className='truncate group-data-[collapsible=icon]:hidden'>
          {status.label} · {API_HOST}
        </span>
      </span>
      <StageBadge className='group-data-[collapsible=icon]:hidden' />
    </div>
  );
}
