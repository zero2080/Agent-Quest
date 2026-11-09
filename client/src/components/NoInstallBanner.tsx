import { useEffect, useState } from 'react';
import './NoInstallBanner.css';
import { isDismissed, setDismissed, resetDismissal } from './noInstallBannerStorage';

interface Props {
  /** null until the first snapshot arrives; empty array means nothing was discovered. */
  configDirs: string[] | null;
  connected: boolean;
}

/**
 * Full-width banner shown when the WebSocket is connected AND the server
 * reported zero config dirs across both providers. Disambiguates the two
 * empty-village states:
 *   - "Neither Claude Code nor Codex is installed"  → this banner
 *   - "At least one provider is installed but idle" → no banner
 * Dismiss is persisted (with one-time migration from the old Claude-only key)
 * so returning users don't see it every load.
 */
export function NoInstallBanner({ configDirs, connected }: Props) {
  const [dismissed, setDismissedState] = useState<boolean>(() => isDismissed());

  // Reset dismissal if a config dir appears later (user installed Claude Code
  // or Codex while the dashboard was open) — don't bury a helpful banner forever.
  useEffect(() => {
    if (configDirs !== null && configDirs.length > 0 && dismissed) {
      resetDismissal();
      setDismissedState(false);
    }
  }, [configDirs, dismissed]);

  if (!connected) return null;
  if (configDirs === null) return null;
  if (configDirs.length > 0) return null;
  if (dismissed) return null;

  const onDismiss = () => {
    setDismissedState(true);
    setDismissed();
  };

  return (
    <div className="no-install-banner" role="status">
      <span className="no-install-icon" aria-hidden>⚠</span>
      <div className="no-install-body">
        <div className="no-install-title">Claude Code 또는 Codex 설치가 감지되지 않았습니다</div>
        <div className="no-install-text">
          서버가 세션 로그가 있는 <code>~/.claude*</code> 또는 <code>~/.codex</code> 디렉터리를 찾지 못했습니다.
          {' '}Claude Code 또는 Codex 세션을 시작하면 여기에 영웅이 나타납니다.
        </div>
      </div>
      <button
        className="no-install-dismiss"
        type="button"
        onClick={onDismiss}
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
