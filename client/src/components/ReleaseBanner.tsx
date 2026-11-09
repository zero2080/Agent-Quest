import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { SERVER_URL } from '../config';
import { isReleaseSnoozed, parseReminder, RELEASE_REMINDER_KEY, REMIND_AFTER_MS, type ReleaseReminder } from './releaseReminder';
import './ReleaseBanner.css';

interface Update {
  currentVersion: string;
  release: { version: string; url: string; notes: string };
}

function readReminder(): ReleaseReminder | null {
  try { return parseReminder(localStorage.getItem(RELEASE_REMINDER_KEY)); } catch { return null; }
}

export function ReleaseBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [reminder, setReminder] = useState(readReminder);

  useEffect(() => {
    let disposed = false;
    let active: AbortController | null = null;
    async function check() {
      if (active) return;
      const controller = new AbortController();
      active = controller;
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch(`${SERVER_URL}/api/updates`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (disposed) return;
        if (data.status === 'up-to-date') setUpdate(null);
        if (data.status === 'available' && typeof data.currentVersion === 'string'
          && typeof data.release?.version === 'string' && typeof data.release.notes === 'string'
          && typeof data.release.url === 'string'
          && data.release.url.startsWith('https://github.com/FulAppiOS/Agent-Quest/releases/tag/')) {
          setUpdate({ currentVersion: data.currentVersion, release: data.release });
        }
      } catch { /* Network failure must remain invisible to the user. */ }
      finally { clearTimeout(timeout); active = null; }
    }
    void check();
    // The server caches GitHub responses for six hours; retry sooner if offline.
    const interval = setInterval(() => { void check(); }, 15 * 60_000);
    const onOnline = () => { void check(); };
    window.addEventListener('online', onOnline);
    return () => {
      disposed = true;
      active?.abort();
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === RELEASE_REMINDER_KEY || event.key === null) setReminder(readReminder());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!reminder) return;
    const remaining = reminder.until - Date.now();
    if (remaining <= 0) { setReminder(null); return; }
    // Clamp malformed timestamps to the maximum timeout supported by browsers.
    const timeout = setTimeout(() => setReminder(null), Math.min(remaining, 2_147_483_647));
    return () => clearTimeout(timeout);
  }, [reminder]);

  if (!update || isReleaseSnoozed(reminder, update.release.version)) return null;
  const { release, currentVersion } = update;

  function remindTomorrow() {
    const next = { version: release.version, until: Date.now() + REMIND_AFTER_MS };
    setReminder(next);
    try { localStorage.setItem(RELEASE_REMINDER_KEY, JSON.stringify(next)); } catch { /* Session-only fallback. */ }
  }

  return (
    <section className="release-banner" aria-label="앱 업데이트">
      <div className="release-banner-header">
        <p role="status"><strong>Agent Quest {release.version} 사용 가능</strong><span>현재 {currentVersion}을(를) 사용 중입니다.</span></p>
        <button type="button" onClick={remindTomorrow}>내일 다시 알림</button>
      </div>
      <details key={release.version} className="release-banner-details">
        <summary>새로운 기능 &amp; 업데이트 방법</summary>
        <h2>새로운 기능</h2>
        <div className="release-banner-notes">
          {release.notes.trim() ? (
            <ReactMarkdown skipHtml disallowedElements={['img']} components={{
              a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
            }}>{release.notes}</ReactMarkdown>
          ) : <p>제공된 릴리스 노트가 없습니다.</p>}
        </div>
        <a href={release.url} target="_blank" rel="noopener noreferrer">GitHub에서 릴리스 보기 ↗</a>
        <h2>수동 업데이트</h2>
        <ol>
          <li>Agent Quest를 실행 중인 컴퓨터의 터미널에서 <kbd>Ctrl+C</kbd>로 앱을 중지합니다.</li>
          <li><code>agentquest update</code>를 실행합니다.</li>
          <li><code>agentquest</code>로 다시 시작한 뒤 이 페이지를 새로고침합니다.</li>
        </ol>
        <p>단축 명령이 없다면 Agent Quest 폴더를 열고 다음을 실행합니다:</p>
        <pre><code>{'git pull --ff-only && bun install\nbun start'}</code></pre>
        <p className="release-banner-hint">업데이터는 main 브랜치를 따릅니다. Git이 로컬 변경 사항이나 충돌을 보고하면 변경 사항을 보존하고 해결한 뒤 계속 진행하세요. 자동으로 업데이트되는 것은 없습니다.</p>
      </details>
    </section>
  );
}
