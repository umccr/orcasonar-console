import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AuthProvider } from '@/auth/AuthProvider';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

/** Renders a page as the console would, at `path`, with a fresh cache and no retries. */
export const renderPage = (page: ReactElement, path = '/') => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([{ path: '*', element: page }], { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <AuthProvider>
            <SidebarProvider>
              <RouterProvider router={router} />
            </SidebarProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
  return { ...view, user, router };
};
