import { isXcodeAgent, sourceBadgeLabel } from '../types/sessionIdentity';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  HERO_CLASS_LABEL, HERO_LABEL_COLOR, SOURCE_BADGE_COLOR, modelBadge, displayActivity, formatTokens, isSubagentAgent, skillShortName,
  type AgentSource, type AgentState, type ContextUsage, type SkillInventory,
} from '../types/agent';
import { HeroAvatar } from './HeroAvatar';
import { SessionReport } from './SessionReport';
import { ContextMeter } from './ContextMeter';
import { configDirLabel } from './configDirLabel';
import { isPath, resolvePath } from './activityFeedUtils';
import { buildSessionJson, buildSessionMarkdown, exportFileName } from '../report/sessionExport';
import { copyText, downloadText } from '../report/download';
import './DetailPanel.css';

interface DetailPanelProps {
  agent: AgentState;
  /** Every known agent — parents and subagents are looked up here. */
  agents: AgentState[];
  skillInventory: Partial<Record<AgentSource, SkillInventory>>;
  onClose: () => void;
  onSelectAgent: (id: string) => void;
  showSourceBadge: boolean;
}

const LIVE_STATUSES = new Set<AgentState['status']>(['active', 'waiting', 'idle']);

function formatDuration(startMs: number): string {
  const elapsed = Math.floor((Date.now() - startMs) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return `${mins}분 ${secs}초`;
}

/** One line explaining where the context window figure comes from. */
function windowSourceNote(c: ContextUsage, source: AgentSource): string {
  switch (c.windowSource) {
    case 'reported': return `${source === 'codex' ? 'Codex' : 'CLI'}가 보고한 윈도우입니다.`;
    case 'configured': return '설정([1m] 모델) 또는 AGENT_QUEST_CLAUDE_CONTEXT_WINDOW에서 가져온 윈도우입니다.';
    case 'inferred': return '사용량으로 추정한 윈도우입니다: 200k 토큰 초과 사용 시 1M 윈도우로 간주합니다.';
    case 'default': return '기본 200k 윈도우로 가정합니다 — 다르다면 AGENT_QUEST_CLAUDE_CONTEXT_WINDOW를 설정하세요.';
  }
}

function PathValue({ path, cwd, className }: { path: string; cwd: string; className?: string }) {
  if (!isPath(path)) {
    return <span className={className}>{path}</span>;
  }
  const absolute = resolvePath(path, cwd);
  if (absolute === null) {
    return <span className={className}>{path}</span>;
  }
  return (
    <a
      href={`vscode://file${encodeURI(absolute)}`}
      className={`${className ?? ''} detail-path-link`}
      title={absolute}
    >{path}</a>
  );
}

export function DetailPanel({ agent, agents, skillInventory, onClose, onSelectAgent, showSourceBadge }: DetailPanelProps) {
  // Tick every second so duration-derived values refresh between server pushes.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [tab, setTab] = useState<'live' | 'report'>('live');
  // Reset to the live tab when switching to a different agent.
  useEffect(() => { setTab('live'); }, [agent.id]);
  const [copied, setCopied] = useState(false);

  const isLive = agent.status === 'active' || agent.status === 'waiting';
  const currentFile = isLive ? agent.currentFile : undefined;
  const currentCommand = isLive ? agent.currentCommand : undefined;
  const lastMessage = isLive ? agent.lastMessage : undefined;

  const children = agents.filter((a) => a.parentId === agent.id && isSubagentAgent(a));
  const parent = agent.parentId !== undefined ? agents.find((a) => a.id === agent.parentId) : undefined;
  const skills = agent.skills ?? [];
  const plugins = agent.plugins ?? [];
  const inventory = skillInventory[agent.source];
  const loadedTokens = skills.reduce((sum, s) => sum + s.loadTokens, 0);

  // AI-review export of this session (plus its subagents): Markdown to paste
  // into another AI, or files to attach.
  const exportMarkdown = () => buildSessionMarkdown(agent, children, inventory);
  const onCopyExport = async () => {
    const ok = await copyText(exportMarkdown());
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  };
  const onDownloadMd = () => downloadText(exportFileName(agent.name, 'md'), exportMarkdown(), 'text/markdown');
  const onDownloadJson = () => downloadText(exportFileName(agent.name, 'json'), JSON.stringify(buildSessionJson(agent, children), null, 2), 'application/json');

  // Last-message overflow detection: the panel itself never grows — when the
  // rendered markdown exceeds the collapsed CSS height we reveal a button
  // that opens a full-size modal with the complete text.
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const [messageOverflows, setMessageOverflows] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Re-measure whenever the message or the agent changes; also close any stale
  // modal if the user selects a different hero.
  useEffect(() => {
    setModalOpen(false);
  }, [agent.id, lastMessage]);
  useLayoutEffect(() => {
    const el = lastMessageRef.current;
    if (el === null || lastMessage === undefined) {
      setMessageOverflows(false);
      return;
    }
    setMessageOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [lastMessage, agent.id]);

  return (
    <>
    <div className="detail-panel">
      <div className="detail-topbar">
        <span className="detail-avatar-wrap">
          <HeroAvatar agent={agent} size={44} />
          <span className={`detail-status-overlay ${agent.status}`} aria-hidden="true" />
        </span>
        <div className="detail-topbar-body">
          <div className="detail-name-row">
            <span className="detail-name" style={{ color: HERO_LABEL_COLOR[agent.heroColor] }}>{agent.name}</span>
            {isSubagentAgent(agent) && <span className="detail-sub-badge" title={agent.subagentType ?? '서브에이전트'}>SUBAGENT</span>}
            {(showSourceBadge || isXcodeAgent(agent)) && (
              <span
                className="detail-source-badge"
                style={{
                  color: SOURCE_BADGE_COLOR[agent.source],
                  borderColor: `${SOURCE_BADGE_COLOR[agent.source]}80`,
                  background: `${SOURCE_BADGE_COLOR[agent.source]}14`,
                }}
                aria-label={`소스 ${sourceBadgeLabel(agent)} · ${agent.source}`}
              >
                {sourceBadgeLabel(agent)}
              </span>
            )}
          </div>
          <div className="detail-class">
            {isSubagentAgent(agent)
              ? <>{'⚔'} {agent.subagentType ?? '서브에이전트'} <span className="detail-class-muted">· {HERO_CLASS_LABEL[agent.heroClass]}</span></>
              : HERO_CLASS_LABEL[agent.heroClass]}
          </div>
        </div>
        <button className="detail-close" onClick={onClose} aria-label="패널 닫기">✕</button>
      </div>

      <div className="detail-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'live'}
          className={`detail-tab ${tab === 'live' ? 'active' : ''}`}
          onClick={() => setTab('live')}
        >실시간</button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'report'}
          className={`detail-tab ${tab === 'report' ? 'active' : ''}`}
          onClick={() => setTab('report')}
        >리포트</button>
        <span className="detail-export" aria-label="이 세션을 AI 리뷰용으로 내보내기">
          <button type="button" className="detail-export-btn" onClick={() => { void onCopyExport(); }} title="이 세션의 Markdown 리포트를 복사해 다른 AI에 붙여넣기">
            {copied ? '복사됨 ✓' : 'MD 복사'}
          </button>
          <button type="button" className="detail-export-btn" onClick={onDownloadMd} title="Markdown 리포트 다운로드">.md</button>
          <button type="button" className="detail-export-btn" onClick={onDownloadJson} title="원본 데이터를 JSON으로 다운로드">.json</button>
        </span>
      </div>

      {tab === 'report' ? (
        <div className="detail-body"><SessionReport agent={agent} subagents={children} /></div>
      ) : (
      <div className="detail-body">
        <div className="detail-section">
          <div className="detail-section-title">상태</div>
          <div className="detail-row">
            <span className="detail-label">현재 상태</span>
            <span className={`detail-value detail-state status-${agent.status}`}>{displayActivity(agent)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">세션</span>
            <span className="detail-value detail-value--num">{formatDuration(agent.sessionStart)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">도구 호출</span>
            <span className="detail-value detail-value--num">{agent.toolCalls.length}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">프로필</span>
            <span className="detail-value">{configDirLabel(agent.configDir)}</span>
          </div>
          {(() => {
            const badge = modelBadge(agent.model);
            if (badge === null) return null;
            return (
              <div className="detail-row">
                <span className="detail-label">모델</span>
                <span className="detail-value detail-model-value">
                  <span
                    className="detail-model-badge"
                    style={{
                      color: badge.color,
                      borderColor: `${badge.color}80`,
                      background: `${badge.color}14`,
                    }}
                  >
                    {badge.short}
                  </span>
                  <span className="detail-model-id" title={agent.model}>{agent.model}</span>
                </span>
              </div>
            );
          })()}
        </div>

        {agent.context !== undefined && (
          <div className="detail-section">
            <div className="detail-section-title">컨텍스트</div>
            <ContextMeter context={agent.context} />
            <div className="detail-row detail-row--spaced">
              <span className="detail-label">사용 중</span>
              <span className="detail-value detail-value--num">
                {formatTokens(agent.context.used)}
                {agent.context.window !== null && <span className="detail-value-suffix">/ {formatTokens(agent.context.window)}</span>}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">최고치</span>
              <span className="detail-value detail-value--num">{formatTokens(agent.context.peak)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">컴팩션</span>
              <span className={`detail-value detail-value--num ${agent.context.compactions > 0 ? 'detail-value--warn' : ''}`}>{agent.context.compactions}</span>
            </div>
            <div className="detail-note">{windowSourceNote(agent.context, agent.source)}</div>
          </div>
        )}

        {(agent.activeSkill !== undefined || skills.length > 0 || plugins.length > 0 || inventory !== undefined) && (
          <div className="detail-section">
            <div className="detail-section-title">스킬 &amp; 플러그인</div>
            {agent.activeSkill !== undefined && (
              <div className="detail-row">
                <span className="detail-label">활성 스킬</span>
                <span className="detail-skill-pill" title={agent.activeSkill}>{'✦'} {skillShortName(agent.activeSkill)}</span>
              </div>
            )}
            {skills.length > 0 && (
              <ul className="detail-usage-list">
                {skills.map((s) => (
                  <li key={s.name} className="detail-usage-row" title={s.name}>
                    <span className="detail-usage-name">
                      {'✦'} {skillShortName(s.name)}
                      {s.plugin !== undefined && <span className="detail-usage-tag">{s.plugin}</span>}
                    </span>
                    <span className="detail-usage-stat">
                      {s.loads}× · ~{formatTokens(s.loadTokens)} 토큰
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {plugins.length > 0 && (
              <ul className="detail-usage-list">
                {plugins.map((p) => (
                  <li key={`${p.kind}:${p.name}`} className="detail-usage-row" title={`${p.kind}: ${p.name}`}>
                    <span className="detail-usage-name">
                      {'⚙'} {p.name}
                      <span className="detail-usage-tag">{p.kind}</span>
                    </span>
                    <span className="detail-usage-stat">
                      {p.calls}회 호출 · ~{formatTokens(p.resultTokens)} 토큰
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {skills.length === 0 && plugins.length === 0 && agent.activeSkill === undefined && (
              <div className="detail-note">아직 사용한 스킬이나 플러그인이 없습니다.</div>
            )}
            {inventory !== undefined && inventory.count > 0 && (
              <div className="detail-note">
                설치된 스킬 {inventory.count}개 (항상 로드 시 ~{formatTokens(inventory.tokens)} 토큰) ·
                여기서 로드됨: {skills.length}개 (~{formatTokens(loadedTokens)}).
              </div>
            )}
          </div>
        )}

        {children.length > 0 && (() => {
          const live = children.filter((c) => LIVE_STATUSES.has(c.status)).length;
          const processed = children.reduce((sum, c) => sum + (c.context?.peak ?? 0), 0);
          const returned = children.reduce((sum, c) => sum + (c.returnedTokens ?? 0), 0);
          return (
            <div className="detail-section">
              <div className="detail-section-title">위임</div>
              <div className="detail-row">
                <span className="detail-label">서브에이전트</span>
                <span className="detail-value detail-value--num">{live} 진행 중 <span className="detail-value-suffix">/ {children.length}</span></span>
              </div>
              <div className="detail-row">
                <span className="detail-label">서브에이전트 처리량</span>
                <span className="detail-value detail-value--num">~{formatTokens(processed)} 토큰</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">여기로 반환</span>
                <span className="detail-value detail-value--num">~{formatTokens(returned)} 토큰</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">이 컨텍스트에서 절약</span>
                <span className="detail-value detail-value--num detail-value--good">~{formatTokens(Math.max(0, processed - returned))} 토큰</span>
              </div>
              <ul className="detail-usage-list">
                {children.map((c) => (
                  <li key={c.id} className="detail-usage-row">
                    <button type="button" className="detail-link-btn" onClick={() => onSelectAgent(c.id)} title={c.id}>
                      {'⚔'} {c.name}
                    </button>
                    <span className={`detail-usage-stat status-${c.status}`}>{displayActivity(c)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {isSubagentAgent(agent) && (parent !== undefined || agent.returnedTokens !== undefined) && (
          <div className="detail-section">
            <div className="detail-section-title">부모</div>
            {parent !== undefined && (
              <div className="detail-row">
                <span className="detail-label">생성한 에이전트</span>
                <button type="button" className="detail-link-btn" onClick={() => onSelectAgent(parent.id)} style={{ color: HERO_LABEL_COLOR[parent.heroColor] }}>
                  {parent.name}
                </button>
              </div>
            )}
            {agent.context !== undefined && (
              <div className="detail-row">
                <span className="detail-label">자체 컨텍스트 최고치</span>
                <span className="detail-value detail-value--num">~{formatTokens(agent.context.peak)} 토큰</span>
              </div>
            )}
            {agent.returnedTokens !== undefined && (
              <div className="detail-row">
                <span className="detail-label">부모에 반환</span>
                <span className="detail-value detail-value--num">~{formatTokens(agent.returnedTokens)} 토큰</span>
              </div>
            )}
          </div>
        )}

        {currentFile !== undefined && (
          <div className="detail-section">
            <div className="detail-section-title">현재 파일</div>
            <PathValue path={currentFile} cwd={agent.cwd} className="detail-value detail-value--path" />
          </div>
        )}

        {currentCommand !== undefined && (
          <div className="detail-section">
            <div className="detail-section-title">현재 명령</div>
            <div className="detail-value detail-value--path">{currentCommand}</div>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-section-title">프로젝트</div>
          <PathValue path={agent.cwd} cwd={agent.cwd} className="detail-value detail-value--path" />
        </div>

        {lastMessage !== undefined && (
          <div className="detail-section">
            <div className="detail-section-title">마지막 메시지</div>
            <div ref={lastMessageRef} className="detail-last-message collapsed">
              <ReactMarkdown>{lastMessage}</ReactMarkdown>
            </div>
            {messageOverflows && (
              <button
                type="button"
                className="detail-last-message-toggle"
                onClick={() => setModalOpen(true)}
              >
                전체 메시지 보기
              </button>
            )}
          </div>
        )}

        {agent.filesModified.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">수정된 파일 ({agent.filesModified.length})</div>
            <ul className="detail-file-list">
              {agent.filesModified.slice(-10).map((f) => (
                <li key={f} title={f}>
                  <PathValue path={f} cwd={agent.cwd} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {agent.errors.length > 0 && (
          <div className="detail-section detail-section--errors">
            <div className="detail-section-title">오류 ({agent.errors.length})</div>
            {agent.errors.slice(-3).map((e, i) => (
              <div key={i} className="detail-value detail-value--error">{e}</div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
    {modalOpen && lastMessage !== undefined && (
      <LastMessageModal
        agentName={agent.name}
        message={lastMessage}
        onClose={() => setModalOpen(false)}
      />
    )}
    </>
  );
}

interface LastMessageModalProps {
  agentName: string;
  message: string;
  onClose: () => void;
}

function LastMessageModal({ agentName, message, onClose }: LastMessageModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lastmsg-backdrop" onClick={onClose}>
      <div
        className="lastmsg-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${agentName}의 마지막 메시지`}
      >
        <button className="lastmsg-close" onClick={onClose} title="닫기 (Esc)" aria-label="닫기">×</button>
        <div className="lastmsg-header">
          <span className="lastmsg-header-label">마지막 메시지:</span>
          <span className="lastmsg-header-name">{agentName}</span>
        </div>
        <div className="lastmsg-body">
          <ReactMarkdown>{message}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
