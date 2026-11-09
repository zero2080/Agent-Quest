import { editorBridge } from '../EditorBridge';
import { editorStore, useEditorStore } from '../state/editor-store';
import type { ToolName } from '../types/editor-events';

interface ToolDef {
  id: ToolName;
  icon: string;
  /** Tooltip on hover — keeps the full description. */
  label: string;
  /** One-word subtitle shown under the icon in the sidebar. */
  caption: string;
}

const TOOLS: ToolDef[] = [
  { id: 'select',         icon: '↖',  label: '선택',              caption: '선택' },
  { id: 'paint',          icon: '🖌', label: '지형 칠하기',        caption: '칠하기' },
  { id: 'erase',          icon: '🩹', label: '지우기',            caption: '지우기' },
  { id: 'decoration',     icon: '🌳', label: '장식',              caption: '장식' },
  { id: 'path',           icon: '〰', label: '길',                caption: '길' },
  { id: 'move-building',  icon: '🏰', label: '건물 이동',          caption: '이동' },
  { id: 'npc',            icon: '👤', label: 'NPC 배치',          caption: 'NPC' },
  { id: 'spawn',          icon: '🚩', label: '영웅 스폰 지점',      caption: '스폰' },
];

export function ToolBar() {
  const activeTool = useEditorStore((s) => s.tool);
  const gridVisible = useEditorStore((s) => s.gridVisible);

  const onSelectTool = (t: ToolName) => {
    editorStore.setTool(t);
    editorBridge.emit('ed:tool:set', t);
  };

  const onZoom = (dir: 'in' | 'out' | 'fit') => {
    editorBridge.emit('ed:zoom', dir);
  };

  const onToggleGrid = () => {
    const next = !gridVisible;
    editorStore.setGrid(next);
    editorBridge.emit('ed:grid:toggle', next);
  };

  return (
    <div className="editor-toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`editor-tool-btn${activeTool === t.id ? ' active' : ''}`}
          title={t.label}
          onClick={() => onSelectTool(t.id)}
        >
          <span className="editor-tool-icon">{t.icon}</span>
          <span className="editor-tool-caption">{t.caption}</span>
        </button>
      ))}
      <div className="editor-tool-divider" />
      <button className="editor-tool-btn" title="확대" onClick={() => onZoom('in')}>
        <span className="editor-tool-icon">＋</span>
        <span className="editor-tool-caption">확대</span>
      </button>
      <button className="editor-tool-btn" title="축소" onClick={() => onZoom('out')}>
        <span className="editor-tool-icon">−</span>
        <span className="editor-tool-caption">축소</span>
      </button>
      <button className="editor-tool-btn" title="화면에 맞춤" onClick={() => onZoom('fit')}>
        <span className="editor-tool-icon">⤢</span>
        <span className="editor-tool-caption">맞춤</span>
      </button>
      {activeTool === 'paint' && (
        <>
          <div className="editor-tool-divider" />
          <button
            className="editor-tool-btn"
            title="지형 전체 채우기 (F)"
            onClick={() => editorBridge.emit('ed:action', 'fill-terrain')}
          >
            <span className="editor-tool-icon">▧</span>
            <span className="editor-tool-caption">채우기</span>
          </button>
        </>
      )}
      <div className="editor-tool-divider" />
      <button
        className={`editor-tool-btn${gridVisible ? ' active' : ''}`}
        title="그리드 표시/숨기기"
        onClick={onToggleGrid}
      >
        <span className="editor-tool-icon">#</span>
        <span className="editor-tool-caption">그리드</span>
      </button>
    </div>
  );
}
