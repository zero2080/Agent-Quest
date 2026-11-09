import { useEffect } from 'react';
import './Tutorial.css';

interface TutorialProps {
  onClose: () => void;
}

const ACTIVITY_LEGEND: { activity: string; building: string; tools: string }[] = [
  { activity: 'Read / Grep / Glob',     building: '도서관',     tools: '코드 검색 및 읽기' },
  { activity: 'Edit / Write',           building: '대장간',     tools: '코드 작성 및 편집' },
  { activity: 'Bash',                   building: '투기장',     tools: '명령 및 테스트 실행' },
  { activity: '생각 중',                building: '성',         tools: '추론 및 계획' },
  { activity: '검토 / 서브에이전트',    building: '망루',       tools: '검토 위임' },
  { activity: 'Git 커밋 / 푸시',        building: '예배당',     tools: '커밋 및 푸시' },
  { activity: '디버깅',                 building: '연금술사',   tools: '오류 수정' },
  { activity: '휴식 / 대기',            building: '선술집',     tools: '작업 사이 휴식' },
];

export function Tutorial({ onClose }: TutorialProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="tutorial-backdrop" onClick={onClose}>
      <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <button className="tutorial-close" onClick={onClose} title="닫기 (Esc)">×</button>

        <img src="assets/logo.png" alt="Agent Quest" className="tutorial-logo" />

        <h2 className="tutorial-title">Agent Quest에 오신 것을 환영합니다</h2>

        <div className="tutorial-tagline">
          <strong>Claude Code CLI</strong>나 <strong>Codex</strong>를 평소처럼 사용하세요 — 세션마다 대시보드에 영웅이 실시간으로 자동 생성됩니다.
        </div>

        <a
          className="tutorial-tip-jar"
          href="https://buymeacoffee.com/fulvio"
          target="_blank"
          rel="noreferrer"
          title="프로젝트 후원 — 맥주 한 잔 사주기"
        >
          <span className="tutorial-tip-jar-icon" aria-hidden="true">🍺</span>
          <span className="tutorial-tip-jar-text">맥주 한 잔 사주기</span>
        </a>

        <p className="tutorial-text">
          Agent Quest는 <strong>Claude Code</strong>와 <strong>Codex</strong> 세션을
          2D 판타지 마을로 바꿔 보여주는 실시간 대시보드입니다. 실행 중인 모든
          에이전트는 <strong>영웅</strong>이 되어 지금 하고 있는 일에 따라 건물
          사이를 오갑니다.
        </p>
        <p className="tutorial-text">
          세션 로그를 로컬에 기록하는 모든 형태의{' '}
          <a
            className="tutorial-link"
            href="https://docs.claude.com/en/docs/claude-code/overview"
            target="_blank"
            rel="noreferrer"
          >Claude Code</a>
          {' '}— 터미널 CLI와 공식 IDE 확장(VS Code, JetBrains) — 에서 작동합니다.{' '}
          <a
            className="tutorial-link"
            href="https://github.com/openai/codex"
            target="_blank"
            rel="noreferrer"
          >Codex</a>
          도 지원하며, <code>~/.codex/sessions/</code>의 롤아웃 로그를 읽습니다.
          Claude 데스크톱 앱이나 브라우저의 claude.ai는 로컬 세션 파일을 노출하지
          않으므로 지원되지 않습니다.
        </p>

        <p className="tutorial-text">
          macOS에서는 <strong>Xcode 안의 Claude Agent 또는 Codex</strong>로 시작한 세션도
          첫 프롬프트 이후 자동으로 표시됩니다. 이 세션들은 <strong>Xcode</strong> 배지와
          프로젝트 폴더에서 따온 이름을 가집니다. 읽기, 편집, 빌드, 테스트, 이슈 진단에
          따라 영웅이 해당 건물 사이를 이동합니다. Agent Quest는 호환되는 로컬 로그를
          읽을 뿐, Xcode를 제어하거나 모든 채팅 제공자를 지원하지는 않습니다.
        </p>

        <div className="tutorial-section-label">활동 → 건물</div>
        <table className="tutorial-legend">
          <tbody>
            {ACTIVITY_LEGEND.map((row) => (
              <tr key={row.building}>
                <td className="tutorial-legend-k">{row.activity}</td>
                <td className="tutorial-legend-v">{row.building}</td>
                <td className="tutorial-legend-desc">{row.tools}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="tutorial-text">
          Claude Code와 Codex 양쪽에 활동 중인 에이전트가 있으면 각 영웅에 작은{' '}
          <strong>CLAUDE</strong> 또는 <strong>CODEX</strong> 배지가 표시되어 어느 CLI에서
          왔는지 구분할 수 있습니다.
        </p>

        <div className="tutorial-section-label">컨텍스트, 스킬 & 서브에이전트</div>
        <p className="tutorial-text">
          영웅 위의 막대는 <strong>컨텍스트 윈도우</strong>입니다: 초록색은 여유가 있다는
          뜻이고, 빨간색(깜빡임)은 컴팩션이 임박했다는 뜻입니다. 상단 바의 <strong>Ctx</strong>
          수치는 사용량이 가장 높은 메인 대화를 따라가며, 클릭하면 모든 활성 에이전트의
          윈도우 목록이 열립니다. <strong>✦ 스킬</strong> 태그는 에이전트가 어떤 스킬 아래에서
          실행 중인지 보여주며, 상세 패널에는 사용된 모든 스킬과 플러그인이 컨텍스트에
          밀어 넣은 토큰과 함께 나열됩니다.
        </p>
        <p className="tutorial-text">
          <strong>기사는 메인 세션입니다.</strong> <strong>서브에이전트</strong>는 폰(울트라
          모드 워크플로 분대는 궁수)으로 표시됩니다: 더 작고 부모의 색을 띠며, 흐릿한 기울임
          이름과 <strong>SUBAGENT · 역할</strong> 배지를 달고, 이를 생성한 기사는
          <strong>⚑ N</strong> 배지를 답니다. 파티 바에서는 부모 아래에 중첩되며, 부모의
          패널에는 위임 덕분에 메인 대화에서 절약된 컨텍스트 양이 표시됩니다. 컨텍스트
          막대는 설정에서 끌 수 있습니다.
        </p>
        <p className="tutorial-text">
          상단 바의 <strong>✦</strong> 버튼은 전체 <strong>스킬 &amp; 플러그인</strong>{' '}
          보기를 엽니다. 거기서 또는 영웅의 패널에서 <strong>내보내기</strong>를 누르면 컨텍스트
          예산, 도구, 스킬, 플러그인, 위임을 담은 Markdown 또는 JSON 보고서가 생성되어 다른
          AI에게 세션 리뷰를 맡길 수 있습니다.
        </p>

        <div className="tutorial-section-label">사용 방법</div>
        <p className="tutorial-text">
          새 Claude Code 또는 Codex 세션을 시작하면 영웅이 실시간으로 나타납니다. 하단
          <em>파티 바</em>에서 영웅을 클릭하면 무엇을 하고 있는지 볼 수 있고, 건물을 클릭하면
          그곳에 있는 영웅들을 볼 수 있습니다. 상단 바의 🗺️ 아이콘은 맵 에디터를 엽니다.
          이 튜토리얼은 언제든{' '}
          <strong>❓</strong> 버튼으로 다시 열 수 있으며, <code>Esc</code>를 누르면 닫힙니다.
        </p>

        <div className="tutorial-section-label">시작하기</div>
        <p className="tutorial-text">
          <code>bun ≥ 1.1.0</code>이 필요합니다. 다음 방법 중 하나로 실행합니다:
        </p>
        <ul className="tutorial-list">
          <li><code>agentquest</code> — 한 줄 설치 스크립트(<code>curl&nbsp;|&nbsp;bash</code>)로 설치한 경우</li>
          <li><code>bun start</code> — 기본 방식, 프로젝트 루트에서 서버 + 클라이언트를 함께 실행</li>
          <li><code>bun run dev:server</code> — 서버만 <code>:4444</code>에서 실행</li>
          <li><code>bun run dev:client</code> — 클라이언트만 <code>:4445</code>에서 실행</li>
        </ul>
        <p className="tutorial-text">
          실행 후 브라우저에서 <code>http://localhost:4445</code>를 열면 마을이 보입니다.
          나중에 업스트림 변경 사항을 가져오려면 <code>agentquest update</code>(또는{' '}
          <code>git pull --ff-only && bun install</code>)를 실행합니다.
        </p>
        <p className="tutorial-text">
          같은 Wi-Fi의 다른 기기와 마을을 공유하려면 실행 명령 앞에{' '}
          <code>AGENT_QUEST_LAN=1</code>을 붙입니다(예: <code>AGENT_QUEST_LAN=1 agentquest</code>) —
          서버가 시작 시 접속 가능한 LAN URL을 출력합니다.
        </p>

        <div className="tutorial-section-label">기술 스택</div>
        <p className="tutorial-text">
          Bun · Hono · WebSocket · React 19 · Phaser 4 · TypeScript · Vite
        </p>

        <div className="tutorial-section-label">개인정보</div>
        <p className="tutorial-text">
          Agent Quest는 에이전트 로그를 로컬에서 읽으며, 그 내용은 절대 업로드되지 않습니다.
          앱은 새 릴리스 확인을 위해 GitHub에 접속하지만 로그나 프롬프트는 전송하지
          않습니다. 설정과 업데이트 알림은 브라우저에만 저장됩니다.
        </p>

        <div className="tutorial-section-label">플랫폼</div>
        <p className="tutorial-text">
          <strong>Claude Code:</strong> macOS와 Windows(<strong>WSL2</strong> 경유 — README 참고)에서 테스트되었습니다.
        </p>
        <p className="tutorial-text">
          <strong>Codex:</strong> macOS에서 테스트되었습니다. Windows는 아직 검증되지 않았습니다.
        </p>
        <p className="tutorial-text">
          <strong>Linux:</strong> 둘 다 작동할 것으로 예상되지만 정기적으로 테스트하지는 않습니다.
        </p>

        <div className="tutorial-section-label">소개</div>
        <p className="tutorial-text">
          <strong>Fulvio Scichilone</strong>(GitHub{' '}
          <a
            className="tutorial-link"
            href="https://github.com/FulAppiOS"
            target="_blank"
            rel="noreferrer"
          >@FulAppiOS</a>
          )이 만들었습니다. MIT 라이선스 오픈 소스 —{' '}
          <a
            className="tutorial-link"
            href="https://github.com/FulAppiOS/agent-quest"
            target="_blank"
            rel="noreferrer"
          >GitHub에서 소스 보기</a>.
        </p>
      </div>
    </div>
  );
}
