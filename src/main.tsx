import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { canonicalUrl } from '@/lib/stage';
import '@/styles/index.css';

const canonical = canonicalUrl(window.location.href);
const root = document.getElementById('root');
if (!root) {
  throw new Error('index.html has no #root element.');
}

if (canonical) {
  // Same path, query and hash, on the host OrcaSonar and Cognito know.
  window.location.replace(canonical);
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
