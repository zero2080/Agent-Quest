import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { dismissStartupLoader } from './game/startupLoader';

const EditorApp = lazy(() => import('./editor/EditorApp'));

const isEditor = new URLSearchParams(window.location.search).get('mode') === 'editor';

// The editor has its own loading UI and does not emit village readiness.
if (isEditor) dismissStartupLoader();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isEditor ? (
      <Suspense fallback={<div style={{ color: '#C4A35A', fontFamily: 'monospace', padding: 40 }}>에디터 불러오는 중…</div>}>
        <EditorApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
