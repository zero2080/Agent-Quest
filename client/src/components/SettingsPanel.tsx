import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from '../hooks/useSettings';
import { SERVER_URL } from '../config';
import { playChime } from '../notifications/sound';
import './SettingsPanel.css';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

function readPermission(): PermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as PermissionState;
}

/** Small reusable on/off switch — label on the left, toggle on the right. */
function Toggle({
  label,
  hint,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className={`settings-toggle ${disabled === true ? 'is-disabled' : ''}`}>
      <span className="settings-toggle-text">
        <span className="settings-toggle-label">{label}</span>
        {hint !== undefined && <span className="settings-toggle-hint">{hint}</span>}
      </span>
      <span className="settings-switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="settings-switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

interface HookStatus {
  installed: boolean;
  anyInstalled: boolean;
  configDirs: string[];
}

interface HookUiState {
  loading: boolean;
  status: HookStatus | null;
  error: string | null;
  busy: boolean;
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const [permission, setPermission] = useState<PermissionState>(() => readPermission());
  const [hook, setHook] = useState<HookUiState>({ loading: true, status: null, error: null, busy: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Keep the permission state in sync with the browser — including changes the
  // user makes in the site settings while the panel is open. Without this, once
  // the permission was 'denied' the "blocked" message would never clear even
  // after the user allowed notifications, because we'd never re-read it.
  useEffect(() => {
    setPermission(readPermission());
    const perms = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
    if (perms?.query === undefined) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const toState = (s: string): PermissionState => (s === 'prompt' ? 'default' : (s as PermissionState));
    // Safari doesn't support querying the 'notifications' permission and may
    // throw synchronously here (not just reject) — wrap the whole call so we
    // fall back cleanly to the direct Notification.permission read above.
    try {
      perms.query({ name: 'notifications' as PermissionName }).then((st) => {
        if (cancelled) { return; }
        status = st;
        setPermission(toState(st.state));
        st.onchange = () => setPermission(toState(st.state));
      }).catch(() => { /* not queryable — fall back to readPermission */ });
    } catch { /* Safari: query('notifications') unsupported — fall back */ }
    return () => { cancelled = true; if (status !== null) status.onchange = null; };
  }, []);

  const sendTestNotification = useCallback(() => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Agent Quest', { body: '알림이 정상 작동합니다 \u{1F514}', tag: 'agentquest:test' });
      }
    } catch { /* ignore */ }
    if (settings.soundEnabled) playChime('waiting', settings.volume);
  }, [settings.soundEnabled, settings.volume]);

  const refreshHook = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/hooks/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      setHook((h) => ({
        ...h,
        loading: false,
        error: null,
        status: {
          installed: data.installed === true,
          anyInstalled: data.anyInstalled === true,
          configDirs: Array.isArray(data.configDirs) ? (data.configDirs as string[]) : [],
        },
      }));
    } catch (e) {
      setHook((h) => ({ ...h, loading: false, error: (e as Error).message }));
    }
  }, []);

  useEffect(() => { void refreshHook(); }, [refreshHook]);

  const setHookEnabled = useCallback(async (enable: boolean) => {
    setHook((h) => ({ ...h, busy: true, error: null }));
    try {
      const res = await fetch(`${SERVER_URL}/api/hooks/${enable ? 'install' : 'uninstall'}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      setHook((h) => ({ ...h, error: (e as Error).message }));
    } finally {
      setHook((h) => ({ ...h, busy: false }));
      await refreshHook();
    }
  }, [refreshHook]);

  // Enabling notifications needs the browser's permission. Ask for it the moment
  // the user flips the master switch on; reflect the outcome in the hint below.
  const handleNotificationsToggle = (next: boolean) => {
    onChange({ notificationsEnabled: next });
    // Re-request whenever we don't already have it. On 'default' the browser
    // prompts; on 'denied' it resolves immediately without a prompt (harmless),
    // and the Permissions API subscription will reflect any later change.
    if (next && permission !== 'granted' && permission !== 'unsupported' && typeof Notification !== 'undefined') {
      void Notification.requestPermission().then((p) => setPermission(p as PermissionState));
    }
  };

  const notifyOn = settings.notificationsEnabled;
  const permissionBlocked = notifyOn && permission === 'denied';
  // The category toggles ("which events do I care about") gate both channels,
  // so they stay live as long as at least one channel — desktop or sound — is on.
  const anyChannel = settings.notificationsEnabled || settings.soundEnabled || settings.inAppToasts;

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="설정">
        <button className="settings-close" onClick={onClose} title="닫기 (Esc)">×</button>

        <h2 className="settings-title">설정</h2>

        <div className="settings-section-label">알림</div>
        <Toggle
          label="데스크톱 알림"
          hint="에이전트가 저를 필요로 하거나 작업을 마치면 알려줍니다"
          checked={notifyOn}
          onToggle={handleNotificationsToggle}
        />
        {permissionBlocked && (
          <p className="settings-warn">
            브라우저에서 알림이 차단되어 있습니다. 브라우저의 사이트 설정에서 이 사이트의
            알림을 허용한 뒤 이 스위치를 다시 켜 주세요.
          </p>
        )}
        {notifyOn && permission === 'unsupported' && (
          <p className="settings-warn">
            이 브라우저는 데스크톱 알림을 지원하지 않습니다 — 소리는 계속 작동합니다.
          </p>
        )}
        {notifyOn && permission === 'granted' && (
          <div className="settings-row">
            <span className="settings-muted">브라우저에서 허용되었습니다.</span>
            <button className="settings-btn" onClick={sendTestNotification}>테스트 보내기</button>
          </div>
        )}
        <Toggle
          label="앱 내 토스트"
          hint="대시보드 안에 표시되는 닫을 수 있는 배너 — 어디서나 작동하며 권한이 필요 없습니다"
          checked={settings.inAppToasts}
          onToggle={(v) => onChange({ inAppToasts: v })}
        />

        <div className="settings-hint-block settings-hook-blurb">
          <strong>정확한 턴 종료 감지</strong> — 로그에서 추론하는 대신 에이전트가 작업을
          마치는 즉시 Claude가 Agent Quest에 알리도록 합니다(오탐 감소, 지연 없음).
          선택 사항이며 Claude 전용입니다. 켜면 Claude <code>settings.json</code>에 작은
          <code>Stop</code> 훅을 추가하며, 기존 훅은 그대로 유지됩니다.
        </div>
        {hook.loading ? (
          <p className="settings-muted">확인 중…</p>
        ) : hook.status === null ? (
          <p className="settings-warn">서버에 연결할 수 없습니다{hook.error !== null ? `: ${hook.error}` : ''}.</p>
        ) : hook.status.configDirs.length === 0 ? (
          <p className="settings-muted">Claude Code 설치가 감지되지 않았습니다.</p>
        ) : (
          <>
            <div className="settings-hook">
              <span className={`settings-hook-state ${hook.status.installed ? 'on' : ''}`}>
                {hook.status.installed ? '정확한 턴 종료 감지: 켜짐' : hook.status.anyInstalled ? '일부만 켜짐' : '정확한 턴 종료 감지: 꺼짐'}
              </span>
              <button
                className="settings-btn"
                disabled={hook.busy}
                onClick={() => { void setHookEnabled(!hook.status!.installed); }}
              >
                {hook.busy ? '…' : hook.status.installed ? '끄기' : '켜기'}
              </button>
            </div>
            {hook.status.anyInstalled && (
              <p className="settings-muted">
                변경 사항을 적용하려면 Claude Code 세션을 재시작하거나 새 세션을 시작해 주세요.
              </p>
            )}
            {hook.error !== null && <p className="settings-warn">{hook.error}</p>}
          </>
        )}

        <div className="settings-subgroup" data-dim={!anyChannel}>
          <Toggle
            label="턴 완료"
            hint="에이전트가 차례를 마치고 기다리고 있습니다"
            checked={settings.notifyWaiting}
            disabled={!anyChannel}
            onToggle={(v) => onChange({ notifyWaiting: v })}
          />
          <Toggle
            label="오류"
            hint="에이전트에 오류가 발생했습니다"
            checked={settings.notifyError}
            disabled={!anyChannel}
            onToggle={(v) => onChange({ notifyError: v })}
          />
          <Toggle
            label="세션 완료"
            hint="에이전트 세션이 종료되었습니다"
            checked={settings.notifyCompleted}
            disabled={!anyChannel}
            onToggle={(v) => onChange({ notifyCompleted: v })}
          />
          <Toggle
            label="컨텍스트 거의 가득 참"
            hint="메인 에이전트의 컨텍스트 윈도우가 85%를 넘었습니다 — 곧 컴팩션이 실행됩니다"
            checked={settings.notifyContext}
            disabled={!anyChannel}
            onToggle={(v) => onChange({ notifyContext: v })}
          />
        </div>

        <div className="settings-section-label">맵</div>
        <Toggle
          label="컨텍스트 막대"
          hint="각 영웅의 이름 위에 컨텍스트 윈도우 사용량을 표시합니다"
          checked={settings.showContextBars}
          onToggle={(v) => onChange({ showContextBars: v })}
        />

        <div className="settings-section-label">소리</div>
        <Toggle
          label="소리 재생"
          hint="알림과 함께 알림음을 울립니다"
          checked={settings.soundEnabled}
          onToggle={(v) => onChange({ soundEnabled: v })}
        />
        <div className="settings-row" data-dim={!settings.soundEnabled}>
          <span className="settings-toggle-label">볼륨</span>
          <input
            className="settings-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={!settings.soundEnabled}
            onChange={(e) => onChange({ volume: Number(e.target.value) })}
            aria-label="알림 볼륨"
          />
          <span className="settings-volume-value">{Math.round(settings.volume * 100)}%</span>
        </div>

        <div className="settings-section-label">방해 금지</div>
        <Toggle
          label="모두 음소거"
          hint="모든 알림과 소리를 일시적으로 끕니다"
          checked={settings.doNotDisturb}
          onToggle={(v) => onChange({ doNotDisturb: v })}
        />

        <p className="settings-foot">
          설정은 이 브라우저에 로컬로 저장됩니다. 아무것도 업로드되지 않습니다.
        </p>
      </div>
    </div>
  );
}
