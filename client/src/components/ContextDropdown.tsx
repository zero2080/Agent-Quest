import { isXcodeAgent } from '../types/sessionIdentity';
import { useEffect, useRef } from 'react';
import { HERO_LABEL_COLOR, STATUS_LABEL, contextLevel, formatTokens, modelBadge, type AgentState } from '../types/agent';
import { rankContextAgents } from '../report/contextRanking';
import { ContextMeter } from './ContextMeter';
import './ContextDropdown.css';

interface ContextDropdownProps {
  agents: AgentState[];
  open: boolean;
  onToggle: () => void;
  onSelect: (agentId: string) => void;
}

/**
 * Top Bar "Ctx" stat with a dropdown. The headline is the hottest live main
 * conversation (the one closest to a compaction) with its name; the dropdown
 * lists every live main agent with its context meter so several sessions can
 * be compared at a glance. Clicking a row selects that hero. Renders nothing
 * until at least one main agent has a measurable window.
 */
export function ContextDropdown({ agents, open, onToggle, onSelect }: ContextDropdownProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rows = rankContextAgents(agents);
  const hottest = rows[0];

  // Close on outside-click / Escape while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current !== null && !wrapRef.current.contains(e.target as Node)) onToggle();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onToggle]);

  // If the list empties while open (last session finished), the wrapper
  // unmounts and the outside-click handler can no longer close it: reset the
  // flag so the dropdown doesn't pop open unprompted for the next agent.
  const empty = hottest === undefined;
  useEffect(() => {
    if (open && empty) onToggle();
  }, [open, empty, onToggle]);

  // Nothing measurable yet: don't show an empty stat (the effects above still
  // run with a stable hook order).
  if (hottest === undefined) return null;

  const level = contextLevel(hottest.pct);
  // Count on the rounded value so the glyph matches the percentage people read.
  const hotCount = rows.filter((r) => Math.round(r.pct) >= 80).length;

  return (
    <div className="topbar-stat ctx-stat" ref={wrapRef}>
      <span className="topbar-stat-label">Ctx:</span>
      <button
        type="button"
        className={`topbar-ctx-btn ctx-${level}`}
        onClick={onToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`컨텍스트 윈도우: 최고는 ${hottest.name} ${Math.round(hottest.pct)}%, 라이브 에이전트 ${rows.length}명`}
        title="가장 많이 사용 중인 메인 에이전트의 컨텍스트 윈도우 — 클릭하면 모든 라이브 에이전트를 비교합니다"
      >
        <span className="ctx-stat-pct">{Math.round(hottest.pct)}%</span>
        <span className="ctx-stat-name">{hottest.name}</span>
        {rows.length > 1 && <span className="ctx-stat-count">{hotCount > 0 ? `${hotCount}⚠ / ${rows.length}` : `/ ${rows.length}`}</span>}
      </button>

      {open && (
        <div className="ctx-dropdown" role="dialog" aria-label="라이브 에이전트의 컨텍스트 윈도우">
          <div className="ctx-dropdown-header">
            <span>컨텍스트 윈도우</span>
            <span className="ctx-dropdown-sub">라이브 에이전트 {rows.length}명</span>
          </div>
          <ul className="ctx-list">
            {rows.map((r) => {
              const badge = modelBadge(r.model);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`ctx-item status-${r.status} ctx-${contextLevel(r.pct)}`}
                    onClick={() => { onSelect(r.id); onToggle(); }}
                    title={`${r.name}: ${formatTokens(r.used)} / ${formatTokens(r.window)} 토큰 — 클릭하여 선택`}
                  >
                    <span className="ctx-item-top">
                      <span className="ctx-item-name" style={{ color: HERO_LABEL_COLOR[r.heroColor] }}>{r.name}</span>
                      {isXcodeAgent(r) && <span className="ctx-item-model" style={{ color: "#88BBFF", background: "#88BBFF26" }}>Xcode</span>}
                      {badge !== null && (
                        <span className="ctx-item-model" style={{ color: badge.color, background: `${badge.color}26` }} title={r.model}>{badge.short}</span>
                      )}
                      <span className={`ctx-item-status status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </span>
                    <span className="ctx-item-meter">
                      <ContextMeter context={{ used: r.used, peak: r.used, window: r.window, windowSource: 'reported', compactions: r.compactions, updatedAt: 0 }} size="mini" />
                    </span>
                    <span className="ctx-item-detail">
                      {formatTokens(r.used)} / {formatTokens(r.window)}
                      {r.compactions > 0 && <span className="ctx-item-compact" title="지금까지의 컴팩션"> · 컴팩션 {r.compactions}회</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
