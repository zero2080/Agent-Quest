import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HERO_LABEL_COLOR, formatTokens, skillShortName,
  type AgentSource, type AgentState, type SkillInventory,
} from '../types/agent';
import { aggregateFleetUsage } from '../report/fleetUsage';
import { buildFleetJson, buildFleetMarkdown, exportFileName } from '../report/sessionExport';
import { copyText, downloadText } from '../report/download';
import { HeroAvatar } from './HeroAvatar';
import { ContextMeter } from './ContextMeter';
import './SettingsPanel.css';
import './SkillsPanel.css';

interface SkillsPanelProps {
  agents: AgentState[];
  skillInventory: Partial<Record<AgentSource, SkillInventory>>;
  onClose: () => void;
  onSelectAgent: (id: string) => void;
}

const LIVE_STATUSES = new Set<AgentState['status']>(['active', 'waiting', 'idle']);
const SOURCE_LABEL: Record<AgentSource, string> = { claude: 'Claude Code', codex: 'Codex' };
const STATUS_LABEL: Record<AgentState['status'], string> = {
  active: '활동 중', waiting: '대기 중', idle: '유휴', completed: '완료', error: '오류',
};

/**
 * Fleet-wide view of the telemetry every hero carries: which skills and
 * plugins are in use across all agents, what they cost in context, how each
 * agent's window is doing — plus the AI-review export for the whole fleet.
 */
export function SkillsPanel({ agents, skillInventory, onClose, onSelectAgent }: SkillsPanelProps) {
  const [scope, setScope] = useState<'live' | 'all'>('live');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const scoped = useMemo(
    () => (scope === 'live' ? agents.filter((a) => LIVE_STATUSES.has(a.status)) : agents),
    [agents, scope],
  );
  const usage = useMemo(() => aggregateFleetUsage(scoped), [scoped]);
  const byId = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const exportMarkdown = useCallback(() => buildFleetMarkdown(scoped, skillInventory), [scoped, skillInventory]);
  const onCopy = useCallback(async () => {
    const ok = await copyText(exportMarkdown());
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  }, [exportMarkdown]);
  const onDownloadMd = useCallback(() => {
    downloadText(exportFileName('fleet', 'md'), exportMarkdown(), 'text/markdown');
  }, [exportMarkdown]);
  const onDownloadJson = useCallback(() => {
    downloadText(exportFileName('fleet', 'json'), JSON.stringify(buildFleetJson(scoped), null, 2), 'application/json');
  }, [scoped]);

  const inventories = (['claude', 'codex'] as const).filter((s) => (skillInventory[s]?.count ?? 0) > 0);

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings-modal skills-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="스킬 및 플러그인">
        <button className="settings-close" onClick={onClose} title="닫기 (Esc)">×</button>
        <h2 className="settings-title">{'✦'} 스킬 &amp; 플러그인</h2>

        <div className="skills-toolbar">
          <div className="skills-scope" role="radiogroup" aria-label="대상 에이전트">
            <button type="button" role="radio" aria-checked={scope === 'live'} className={`skills-scope-btn ${scope === 'live' ? 'on' : ''}`} onClick={() => setScope('live')}>실행 중 에이전트</button>
            <button type="button" role="radio" aria-checked={scope === 'all'} className={`skills-scope-btn ${scope === 'all' ? 'on' : ''}`} onClick={() => setScope('all')}>전체 ({agents.length})</button>
          </div>
          <div className="skills-export" aria-label="AI 리뷰용 내보내기">
            <span className="skills-export-label">AI 리뷰용 내보내기</span>
            <button type="button" className="settings-btn" onClick={() => { void onCopy(); }} title="대상 에이전트 전체의 Markdown 리포트 복사">
              {copied ? '복사됨 ✓' : 'Markdown 복사'}
            </button>
            <button type="button" className="settings-btn" onClick={onDownloadMd} title="Markdown 리포트 다운로드">.md</button>
            <button type="button" className="settings-btn" onClick={onDownloadJson} title="원본 데이터를 JSON으로 다운로드">.json</button>
          </div>
        </div>

        <div className="skills-tiles">
          <div className="skills-tile"><span className="skills-tile-v">{usage.skills.length}</span><span className="skills-tile-k">사용 중인 스킬</span></div>
          <div className="skills-tile"><span className="skills-tile-v">~{formatTokens(usage.totals.skillTokens)}</span><span className="skills-tile-k">스킬 토큰</span></div>
          <div className="skills-tile"><span className="skills-tile-v">{usage.totals.pluginCalls}</span><span className="skills-tile-k">플러그인 호출</span></div>
          <div className="skills-tile"><span className="skills-tile-v">~{formatTokens(usage.totals.pluginTokens)}</span><span className="skills-tile-k">플러그인 토큰</span></div>
        </div>
        {inventories.length > 0 && (
          <p className="settings-muted skills-inventory">
            {inventories.map((s) => `${SOURCE_LABEL[s]}: 설치된 스킬 ${skillInventory[s]!.count}개 (항상 로드 시 ~${formatTokens(skillInventory[s]!.tokens)} 토큰)`).join(' · ')}.
            {' '}스킬을 필요할 때만 로드하여 대상 컨텍스트에서 ~{formatTokens(Math.max(0, inventories.reduce((sum, s) => sum + skillInventory[s]!.tokens, 0) - usage.totals.skillTokens))} 토큰을 절약했습니다.
          </p>
        )}

        <div className="settings-section-label">스킬</div>
        {usage.skills.length === 0 ? (
          <p className="settings-muted">대상 에이전트가 로드한 스킬이 없습니다.</p>
        ) : (
          <table className="skills-table">
            <thead><tr><th>스킬</th><th>플러그인</th><th className="num">로드</th><th className="num">~토큰</th><th className="num">에이전트</th></tr></thead>
            <tbody>
              {usage.skills.map((s) => (
                <tr key={s.name} title={s.name}>
                  <td>{'✦'} {skillShortName(s.name)}</td>
                  <td className="muted">{s.plugin ?? '–'}</td>
                  <td className="num">{s.loads}</td>
                  <td className="num">~{formatTokens(s.loadTokens)}</td>
                  <td className="num">{s.agents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="settings-section-label">플러그인 &amp; MCP</div>
        {usage.plugins.length === 0 ? (
          <p className="settings-muted">대상 에이전트의 플러그인 또는 MCP 호출이 없습니다.</p>
        ) : (
          <table className="skills-table">
            <thead><tr><th>플러그인 / 서버</th><th>종류</th><th className="num">호출</th><th className="num">~토큰</th><th className="num">에이전트</th></tr></thead>
            <tbody>
              {usage.plugins.map((p) => (
                <tr key={`${p.kind}:${p.name}`} title={`${p.kind}: ${p.name}`}>
                  <td>{'⚙'} {p.name}</td>
                  <td className="muted">{p.kind}</td>
                  <td className="num">{p.calls}</td>
                  <td className="num">~{formatTokens(p.resultTokens)}</td>
                  <td className="num">{p.agents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="settings-section-label">에이전트</div>
        {usage.agents.length === 0 ? (
          <p className="settings-muted">대상 에이전트가 없습니다.</p>
        ) : (
          <ul className="skills-agents">
            {usage.agents.map((row) => {
              const agent = byId.get(row.id);
              if (agent === undefined) return null;
              const parent = row.parentId !== undefined ? byId.get(row.parentId) : undefined;
              return (
                <li key={row.id} className={`skills-agent ${row.isSubagent ? 'is-sub' : ''}`}>
                  <button type="button" className="skills-agent-main" onClick={() => onSelectAgent(row.id)} title={`${row.name} 선택`}>
                    <HeroAvatar agent={agent} size={28} />
                    <span className="skills-agent-name" style={{ color: HERO_LABEL_COLOR[agent.heroColor] }}>
                      {row.isSubagent ? '⚔ ' : ''}{row.name}
                    </span>
                    {row.isSubagent && parent !== undefined && <span className="skills-agent-parent">부모: {parent.name}</span>}
                    <span className={`skills-agent-status status-${row.status}`}>{STATUS_LABEL[row.status]}</span>
                  </button>
                  <span className="skills-agent-ctx"><ContextMeter context={agent.context} size="mini" /></span>
                  <span className="skills-agent-meta">
                    {row.activeSkill !== undefined && <span className="skills-chip" title={row.activeSkill}>{'✦'} {skillShortName(row.activeSkill)}</span>}
                    <span className="muted">스킬 ~{formatTokens(row.skillTokens)} · 플러그인 ~{formatTokens(row.pluginTokens)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="settings-foot">
          ~ 표시가 붙은 수치는 추정치입니다 (문자 수 ÷ 4). 내보내기는 같은 데이터를 Markdown 또는 JSON으로 묶어 Agent Quest 외부의 AI가 세션을 리뷰할 수 있게 합니다.
        </p>
      </div>
    </div>
  );
}
