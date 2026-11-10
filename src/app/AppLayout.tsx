import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

/** The sidebar, and the page beside it. */
export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className='min-w-0'>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PageLoading() {
  return (
    <div className='space-y-4 px-6 pt-6'>
      <Skeleton className='h-8 w-48' />
      <Skeleton className='h-14 w-full' />
      <Skeleton className='h-64 w-full' />
    </div>
  );
}
