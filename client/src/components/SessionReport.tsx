import { isXcodeAgent } from '../types/sessionIdentity';
import { useMemo } from 'react';
import { formatTokens, skillShortName, type AgentActivity, type AgentState } from '../types/agent';
import { computeSessionReport } from '../report/sessionReport';
import { configDirLabel } from './configDirLabel';
import { ContextMeter } from './ContextMeter';
import './SessionReport.css';

const ACTIVITY_COLOR: Record<AgentActivity, string> = {
  idle: '#888888', thinking: '#C48BE8', reading: '#88BBFF', editing: '#FF8C42',
  bash: '#FF9966', git: '#88E08A', debugging: '#FF6B6B', reviewing: '#7AE0C8',
};
const ACTIVITY_LABEL: Record<AgentActivity, string> = {
  idle: '휴식 중', thinking: '생각 중', reading: '읽는 중', editing: '편집 중',
  bash: '명령 실행 중', git: 'Git 작업 중', debugging: '디버깅 중', reviewing: '검토 중',
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${sec}초`;
  return `${sec}초`;
}

function cwdBasename(cwd: string): string {
  const parts = cwd.split('/').filter((p) => p.length > 0);
  return parts[parts.length - 1] ?? cwd;
}

interface SessionReportProps {
  agent: AgentState;
  /** The session's subagents (any status), for the delegation block. */
  subagents?: AgentState[];
}

export function SessionReport({ agent, subagents = [] }: SessionReportProps) {
  const r = useMemo(() => computeSessionReport(agent, subagents), [agent, subagents]);

  return (
    <div className="report">
      <div className="report-env">
        <span className="report-env-item"><span className="report-env-k">프로필</span> {configDirLabel(agent.configDir)}</span>
        <span className="report-env-item"><span className="report-env-k">프로젝트</span> {isXcodeAgent(agent) && !agent.isSubagent ? agent.name : agent.cwd.length > 0 ? cwdBasename(agent.cwd) : '—'}</span>
        {agent.model !== undefined && <span className="report-env-item"><span className="report-env-k">모델</span> {agent.model}</span>}
      </div>

      <div className="report-stats">
        <div className="report-stat"><span className="report-stat-v">{formatDuration(r.durationMs)}</span><span className="report-stat-k">소요 시간</span></div>
        <div className="report-stat"><span className="report-stat-v">{r.toolTotal}</span><span className="report-stat-k">도구 호출</span></div>
        <div className="report-stat"><span className="report-stat-v">{r.filesModified}</span><span className="report-stat-k">파일</span></div>
        <div className="report-stat"><span className={`report-stat-v ${r.errorCount > 0 ? 'is-err' : ''}`}>{r.errorCount}</span><span className="report-stat-k">오류</span></div>
      </div>

      <div className="report-section-title">활동 (도구 사용 기준)</div>
      {r.byActivity.length === 0 ? (
        <div className="report-empty">기록된 도구 활동이 없습니다.</div>
      ) : (
        <div className="report-bars">
          {r.byActivity.map((s) => (
            <div className="report-bar-row" key={s.activity}>
              <span className="report-bar-label">{ACTIVITY_LABEL[s.activity]}</span>
              <span className="report-bar-track">
                <span className="report-bar-fill" style={{ width: `${Math.max(2, s.pct)}%`, background: ACTIVITY_COLOR[s.activity] }} />
              </span>
              <span className="report-bar-count">{s.count}</span>
            </div>
          ))}
        </div>
      )}

      {r.topTools.length > 0 && (
        <>
          <div className="report-section-title">주요 도구</div>
          <div className="report-tools">
            {r.topTools.map((t) => (
              <span className="report-tool" key={t.name}>{t.name} <span className="report-tool-n">{t.count}</span></span>
            ))}
          </div>
        </>
      )}

      {r.context !== undefined && (
        <>
          <div className="report-section-title">컨텍스트 윈도우</div>
          <ContextMeter context={agent.context} />
          <div className="report-econ report-econ--spaced">
            <div className="report-econ-row"><span>사용 중</span><span>{formatTokens(r.context.used)}{r.context.window !== null ? ` / ${formatTokens(r.context.window)}` : ''}</span></div>
            <div className="report-econ-row"><span>최대</span><span>{formatTokens(r.context.peak)}</span></div>
            <div className="report-econ-row"><span>컴팩션</span><span>{r.context.compactions}</span></div>
          </div>
        </>
      )}

      {r.skills.length > 0 && (
        <>
          <div className="report-section-title">로드된 스킬</div>
          <div className="report-econ">
            {r.skills.map((s) => (
              <div className="report-econ-row" key={s.name} title={s.name}>
                <span>{'✦'} {skillShortName(s.name)}{s.plugin !== undefined ? <span className="report-est"> {s.plugin}</span> : null}</span>
                <span>{s.loads}× · ~{formatTokens(s.loadTokens)}{s.attributedMessages > 0 ? ` · 메시지 ${s.attributedMessages}개` : ''}</span>
              </div>
            ))}
          </div>
          <div className="report-muted report-tokens-note">~토큰 = 컨텍스트에 들어간 스킬 텍스트 (문자 수 ÷ 4).</div>
        </>
      )}

      {r.plugins.length > 0 && (
        <>
          <div className="report-section-title">플러그인 &amp; MCP</div>
          <div className="report-econ">
            {r.plugins.map((p) => (
              <div className="report-econ-row" key={`${p.kind}:${p.name}`} title={`${p.kind}: ${p.name}`}>
                <span>{'⚙'} {p.name} <span className="report-est">{p.kind}</span></span>
                <span>호출 {p.calls}회 · ~{formatTokens(p.resultTokens)}</span>
              </div>
            ))}
          </div>
          <div className="report-muted report-tokens-note">~토큰 = 컨텍스트에 들어간 도구 결과.</div>
        </>
      )}

      {r.delegation !== undefined && (
        <>
          <div className="report-section-title">위임</div>
          <div className="report-econ">
            <div className="report-econ-row"><span>서브에이전트</span><span>{r.delegation.count}개 중 {r.delegation.live}개 실행 중</span></div>
            <div className="report-econ-row"><span>서브에이전트가 처리</span><span>~{formatTokens(r.delegation.childPeakTokens)}</span></div>
            <div className="report-econ-row"><span>여기로 반환</span><span>~{formatTokens(r.delegation.returnedTokens)}</span></div>
            <div className="report-econ-row report-econ-total"><span>이 컨텍스트에서 절약</span><span>~{formatTokens(r.delegation.keptOutTokens)}</span></div>
          </div>
        </>
      )}

      {/* Tokens — Claude only. Codex doesn't report per-message usage, so the
          section is omitted entirely for it (no misleading empty rows). */}
      {r.hasTokens ? (
        <>
          <div className="report-section-title">토큰</div>
          <div className="report-econ">
            <div className="report-econ-row"><span>입력</span><span>{formatTokens(r.tokens.input)}</span></div>
            <div className="report-econ-row"><span>출력</span><span>{formatTokens(r.tokens.output)}</span></div>
            <div className="report-econ-row"><span>캐시 읽기</span><span>{formatTokens(r.tokens.cacheRead)}</span></div>
            <div className="report-econ-row"><span>캐시 쓰기</span><span>{formatTokens(r.tokens.cacheWrite)}</span></div>
            <div className="report-econ-row report-econ-total"><span>전체 토큰</span><span>{formatTokens(r.tokens.total)}</span></div>
          </div>
          <div className="report-muted report-tokens-note">이 세션의 토큰만 집계합니다 — 서브에이전트는 별도로 추적됩니다.</div>
        </>
      ) : r.source === 'claude' ? (
        <>
          <div className="report-section-title">토큰</div>
          <div className="report-muted">이 세션의 토큰 사용량이 아직 기록되지 않았습니다.</div>
        </>
      ) : null}
    </div>
  );
}
