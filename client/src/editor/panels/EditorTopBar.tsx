import { editorBridge } from '../EditorBridge';
import { editorStore, useEditorStore } from '../state/editor-store';
import type { SlotInfo } from '../types/map';

export function EditorTopBar() {
  const dirty = useEditorStore((s) => s.dirty);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const saveError = useEditorStore((s) => s.saveError);
  const saving = useEditorStore((s) => s.saving);
  const currentSlot = useEditorStore((s) => s.currentSlot);
  const activeSlot = useEditorStore((s) => s.activeSlot);
  const slotInfo = useEditorStore((s) => s.slotInfo);

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const statusText = (() => {
    if (saveError !== null) return `저장 오류: ${saveError}`;
    if (saving) return '저장 중...';
    if (dirty) return '저장되지 않은 변경 사항';
    if (lastSavedAt !== null) return `${formatTime(lastSavedAt)} 저장됨`;
    return '준비됨';
  })();

  const statusClass = saveError !== null
    ? 'editor-status error'
    : dirty ? 'editor-status dirty' : lastSavedAt !== null ? 'editor-status saved' : 'editor-status';

  const onSave = () => {
    editorStore.setSaving(true);
    editorBridge.emit('ed:action', 'save');
  };

  const onSetActive = () => {
    editorBridge.emit('ed:action', 'set-active');
  };

  const onClearMap = () => {
    if (confirm('맵을 비우시겠습니까? 지형, 장식, 길, NPC가 모두 삭제됩니다. 유지하려면 저장을 눌러야 합니다.')) {
      editorBridge.emit('ed:action', 'reset-all');
    }
  };

  const onLoadTemplate = () => {
    if (confirm('기본 템플릿을 이 슬롯에 불러오시겠습니까? 저장되지 않은 변경 사항은 사라집니다. 유지하려면 저장을 눌러야 합니다.')) {
      editorBridge.emit('ed:action', 'load-template');
    }
  };

  const onSlotClick = (info: SlotInfo) => {
    editorStore.setCurrentSlot(info.slot);
    editorBridge.emit('ed:slot:load', info.slot);
  };

  const getSlotLabel = (info: SlotInfo): string => {
    const star = info.isActive ? ' \u2605' : '';
    if (info.isEmpty) return `${info.slot}${star}`;
    const name = info.name.length > 10 ? info.name.slice(0, 10) + '...' : info.name;
    return `${info.slot} \u2014 ${name}${star}`;
  };

  return (
    <div className="editor-topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="editor-topbar-title">맵 에디터</div>
        <div className="editor-slot-tabs">
          {slotInfo.map((info) => {
            const isCurrentSlot = info.slot === currentSlot;
            const classes = [
              'editor-slot-tab',
              isCurrentSlot ? 'active' : '',
              !info.isEmpty ? 'has-map' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={info.slot}
                className={classes}
                title={info.isEmpty ? `슬롯 ${info.slot} (비어 있음)` : `${info.name}${info.isActive ? ' (활성)' : ''}`}
                onClick={() => onSlotClick(info)}
              >
                {getSlotLabel(info)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="editor-topbar-actions">
        <span className={statusClass}>{statusText}</span>
        <button className="editor-btn primary" onClick={onSave} disabled={saving}>저장</button>
        <button
          className="editor-btn"
          onClick={onSetActive}
          title="이 슬롯을 대시보드의 활성 맵으로 설정"
        >
          활성화 {currentSlot === activeSlot ? '\u2605' : ''}
        </button>
        <button
          className="editor-btn"
          onClick={onLoadTemplate}
          title="기본 템플릿 맵을 이 슬롯에 불러오기 (현재 내용을 대체)"
        >
          템플릿 불러오기
        </button>
        <button className="editor-btn danger" onClick={onClearMap}>맵 비우기</button>
        <a className="editor-btn" href="/" style={{ textDecoration: 'none' }}>마을로 돌아가기</a>
      </div>
    </div>
  );
}
