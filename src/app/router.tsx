import { createBrowserRouter } from 'react-router';
import { AppLayout } from './AppLayout';
import { AuditLogPage, ChatPage, SearchPage, UsagePage } from './lazy-pages';
import { NotFoundPage, RouteError } from './pages';

/** The console's pages, under `/orcasonar/` as the portal serves it. Made once the reader is signed in. */
export const createAppRouter = () =>
  createBrowserRouter(
    [
      {
        path: '/',
        Component: AppLayout,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <UsagePage /> },
          { path: 'audit', element: <AuditLogPage /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
    { basename: import.meta.env.BASE_URL }
  );
