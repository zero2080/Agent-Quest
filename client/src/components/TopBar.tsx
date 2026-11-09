import { useEffect, useRef, useState } from 'react';
import type { AgentState } from '../types/agent';
import { eventBridge } from '../game/EventBridge';
import { NotificationMenu, type NotificationEntry } from './NotificationMenu';
import { ContextDropdown } from './ContextDropdown';
import './TopBar.css';

interface TopBarNotifications {
  entries: NotificationEntry[];
  unread: number;
  open: boolean;
  onToggle: () => void;
  onActivate: (agentId: string) => void;
  onClear: () => void;
}

interface TopBarProps {
  agents: AgentState[];
  connected: boolean;
  notifications: TopBarNotifications;
}

export function TopBar({ agents, connected, notifications }: TopBarProps) {
  const active = agents.filter((a) => a.status === 'active').length;
  const waiting = agents.filter((a) => a.status === 'waiting').length;
  const idle = agents.filter((a) => a.status === 'idle').length;
  const completed = agents.filter((a) => a.status === 'completed').length;
  const errors = agents.filter((a) => a.status === 'error').length;

  const [nightOn, setNightOn] = useState(false);
  const [rainOn, setRainOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const toggleNight = () => {
    const next = !nightOn;
    setNightOn(next);
    eventBridge.emit('effect:night:toggle', next);
  };

  const toggleRain = () => {
    const next = !rainOn;
    setRainOn(next);
    eventBridge.emit('effect:rain:toggle', next);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    hamburgerRef.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 641px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      <header className="topbar" data-menu-open={menuOpen}>
        <button
          type="button"
          className="topbar-logo-button"
          onClick={() => eventBridge.emit('tutorial:open')}
          title="튜토리얼 보기"
          aria-label="튜토리얼 보기"
        >
          <img src="assets/logo.png" alt="Agent Quest" className="topbar-logo" />
        </button>

        <span
          className={`topbar-status-dot ${connected ? 'online' : 'offline'}`}
          role="status"
          aria-label={connected ? '온라인' : '오프라인'}
          title={connected ? '온라인' : '오프라인'}
        />

        <div
          id="topbar-tools"
          className="topbar-tools"
          role="region"
          aria-label="상단 바 메뉴"
        >
          <div className="topbar-stats">
            <div className="topbar-stat">
              <span className="topbar-stat-label">상태:</span>
              <span className={`topbar-stat-value ${connected ? 'active' : 'error'}`}>
                {connected ? '온라인' : '오프라인'}
              </span>
            </div>
            <div className="topbar-stat">
              <span className="topbar-stat-label">활동:</span>
              <span className="topbar-stat-value active">{active}</span>
            </div>
            {waiting > 0 && (
              <div className="topbar-stat">
                <span className="topbar-stat-label">대기:</span>
                <span className="topbar-stat-value waiting">{waiting}</span>
              </div>
            )}
            <div className="topbar-stat">
              <span className="topbar-stat-label">유휴:</span>
              <span className="topbar-stat-value idle">{idle}</span>
            </div>
            <div className="topbar-stat">
              <span className="topbar-stat-label">완료:</span>
              <span className="topbar-stat-value">{completed}</span>
            </div>
            {errors > 0 && (
              <div className="topbar-stat">
                <span className="topbar-stat-label">오류:</span>
                <span className="topbar-stat-value error">{errors}</span>
              </div>
            )}
            <div className="topbar-stat">
              <span className="topbar-stat-label">전체:</span>
              <span className="topbar-stat-value">{agents.length}</span>
            </div>
            <ContextDropdown
              agents={agents}
              open={ctxOpen}
              onToggle={() => setCtxOpen((v) => !v)}
              onSelect={(id) => eventBridge.emit('hero:clicked', id)}
            />
          </div>

          <div className="topbar-effects">
            <NotificationMenu
              entries={notifications.entries}
              unread={notifications.unread}
              open={notifications.open}
              onToggle={notifications.onToggle}
              onActivate={notifications.onActivate}
              onClear={notifications.onClear}
            />
            <button
              className={`topbar-effect-btn ${nightOn ? 'active' : ''}`}
              onClick={toggleNight}
              title={nightOn ? '주간 모드' : '야간 모드'}
            >
              {nightOn ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
            </button>
            <button
              className={`topbar-effect-btn ${rainOn ? 'active' : ''}`}
              onClick={toggleRain}
              title={rainOn ? '비 그치기' : '비 내리기'}
            >
              {'\u{1F327}\u{FE0F}'}
            </button>
            <a
              className="topbar-effect-btn"
              data-mobile-hide="true"
              href="/?mode=editor"
              target="_blank"
              rel="noopener"
              title="맵 에디터 열기"
              style={{ textDecoration: 'none' }}
            >
              {'\u{1F5FA}\u{FE0F}'}
            </a>
            <button
              className="topbar-effect-btn topbar-skills-btn"
              onClick={() => eventBridge.emit('skills:open')}
              title="스킬 & 플러그인 — 전체 보기 및 AI 리뷰용 내보내기"
              aria-label="스킬 및 플러그인"
            >
              {'\u2726'}
            </button>
            <button
              className="topbar-effect-btn"
              onClick={() => eventBridge.emit('settings:open')}
              title="설정"
              aria-label="설정"
            >
              {'\u{2699}\u{FE0F}'}
            </button>
            <button
              className="topbar-effect-btn"
              onClick={() => eventBridge.emit('tutorial:open')}
              title="튜토리얼 보기"
            >
              {'\u{2753}'}
            </button>
          </div>
        </div>

        <button
          ref={hamburgerRef}
          type="button"
          className="topbar-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="topbar-tools"
          aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="topbar-menu-toggle-bar" />
          <span className="topbar-menu-toggle-bar" />
          <span className="topbar-menu-toggle-bar" />
        </button>
      </header>

      {menuOpen && <div className="topbar-overlay" onClick={closeMenu} aria-hidden="true" />}
    </>
  );
}
