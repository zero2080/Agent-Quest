import { editorBridge } from '../EditorBridge';
import { editorStore, useEditorStore } from '../state/editor-store';
import type { UnitColor, UnitType } from '../types/map';

// Kept as fallbacks only — the actual option lists shown in the NPC
// dropdowns are derived from the active manifest's npcSprites so themes
// that add units (e.g. CC0 goblins) or remove colors flow through without
// code changes. See the body of the npc-kind selection branch below.
const NPC_UNITS_FALLBACK: UnitType[] = ['warrior', 'archer', 'pawn'];
const NPC_COLORS_FALLBACK: UnitColor[] = ['blue', 'red', 'black', 'yellow', 'purple'];

export function Inspector() {
  const selection = useEditorStore((s) => s.selection);
  const stats = useEditorStore((s) => s.stats);
  const heroScale = useEditorStore((s) => s.heroScale);
  const manifest = useEditorStore((s) => s.manifest);

  const onDelete = () => editorBridge.emit('ed:delete:selected');

  if (selection === null) {
    return (
      <div className="editor-inspector">
        <div className="editor-palette-header">통계</div>
        <div className="editor-stat">
          <span className="editor-stat-label">지형 셀</span>
          <span className="editor-stat-value">{stats.terrainCells}</span>
        </div>
        <div className="editor-stat">
          <span className="editor-stat-label">장식</span>
          <span className="editor-stat-value">{stats.decorations}</span>
        </div>
        <div className="editor-stat">
          <span className="editor-stat-label">길</span>
          <span className="editor-stat-value">{stats.paths}</span>
        </div>
        <div className="editor-stat">
          <span className="editor-stat-label">건물</span>
          <span className="editor-stat-value">{stats.buildings}</span>
        </div>
        <div className="editor-stat">
          <span className="editor-stat-label">NPC</span>
          <span className="editor-stat-value">{stats.npcs}</span>
        </div>

        <div className="editor-palette-header" style={{ marginTop: 8 }}>설정</div>
        <div className="editor-row">
          <label>영웅 크기</label>
          <input
            type="range"
            min="0.15"
            max="0.60"
            step="0.01"
            value={heroScale}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              editorStore.setHeroScale(val);
              editorBridge.emit('ed:settings:update', { heroScale: val });
            }}
          />
          <span style={{ fontSize: 11 }}>{heroScale.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  if (selection.kind === 'decoration') {
    return (
      <div className="editor-inspector">
        <div className="editor-palette-header">장식</div>
        <div className="editor-inspector-label">아이디</div>
        <div className="editor-inspector-value" style={{ fontSize: 10 }}>{selection.id}</div>
        <div className="editor-inspector-label">텍스처</div>
        <div className="editor-inspector-value">{selection.textureKey}</div>
        <div className="editor-inspector-label">위치</div>
        <div className="editor-inspector-value">{Math.round(selection.x)}, {Math.round(selection.y)}</div>
        <div className="editor-inspector-label">크기</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={selection.scale}
            onChange={(e) => editorBridge.emit('ed:decoration:scale', { id: selection.id, scale: parseFloat(e.target.value) })}
            style={{ flex: 1, accentColor: '#C4A35A', height: 4 }}
          />
          <span className="editor-inspector-value">{selection.scale.toFixed(2)}</span>
        </div>
        <button className="editor-btn danger" onClick={onDelete}>삭제</button>
      </div>
    );
  }

  if (selection.kind === 'building') {
    return (
      <div className="editor-inspector">
        <div className="editor-palette-header">건물</div>
        <div className="editor-inspector-label">아이디</div>
        <div className="editor-inspector-value">{selection.id}</div>
        <div className="editor-inspector-label">라벨</div>
        <div className="editor-inspector-value">{selection.label}</div>
        <div className="editor-inspector-label">위치</div>
        <div className="editor-inspector-value">{Math.round(selection.x)}, {Math.round(selection.y)}</div>
        <div style={{ fontSize: 10, color: '#888' }}>위치를 변경하려면 "건물 이동" 도구를 사용하세요.</div>
      </div>
    );
  }

  if (selection.kind === 'npc') {
    // Derive available unit/color options from the active manifest so
    // themes that introduce new unit types (e.g. CC0 goblins) appear
    // in the dropdown without code changes. Preserve manifest insertion
    // order so rows match the palette ordering.
    const npcUnits: UnitType[] = [];
    const seenUnits = new Set<UnitType>();
    const npcColors: UnitColor[] = [];
    const seenColors = new Set<UnitColor>();
    for (const s of manifest?.npcSprites ?? []) {
      if (!seenUnits.has(s.unit)) { seenUnits.add(s.unit); npcUnits.push(s.unit); }
      if (!seenColors.has(s.color)) { seenColors.add(s.color); npcColors.push(s.color); }
    }
    // Fallback for the brief pre-manifest window during boot.
    const unitOptions = npcUnits.length > 0 ? npcUnits : NPC_UNITS_FALLBACK;
    const colorOptions = npcColors.length > 0 ? npcColors : NPC_COLORS_FALLBACK;

    const onNpcChange = (updates: Partial<{ unit: UnitType; color: UnitColor; scale: number; wanderRadius: number }>) => {
      const updated = {
        id: selection.id,
        unit: updates.unit ?? selection.unit,
        color: updates.color ?? selection.color,
        x: selection.x,
        y: selection.y,
        scale: updates.scale ?? selection.scale,
        wanderRadius: updates.wanderRadius ?? selection.wanderRadius,
      };
      editorBridge.emit('ed:npc:update', updated);
    };

    return (
      <div className="editor-inspector">
        <div className="editor-palette-header">NPC</div>
        <div className="editor-inspector-label">아이디</div>
        <div className="editor-inspector-value" style={{ fontSize: 10 }}>{selection.id}</div>

        <div className="editor-inspector-label">유닛 종류</div>
        <select
          value={selection.unit}
          onChange={(e) => onNpcChange({ unit: e.target.value as UnitType })}
        >
          {unitOptions.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <div className="editor-inspector-label">색상</div>
        <select
          value={selection.color}
          onChange={(e) => onNpcChange({ color: e.target.value as UnitColor })}
        >
          {colorOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="editor-inspector-label">위치</div>
        <div className="editor-inspector-value">{Math.round(selection.x)}, {Math.round(selection.y)}</div>

        <div className="editor-inspector-label">크기</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.01"
            value={selection.scale}
            onChange={(e) => onNpcChange({ scale: parseFloat(e.target.value) })}
            style={{ flex: 1, accentColor: '#C4A35A', height: 4 }}
          />
          <span className="editor-inspector-value">{selection.scale.toFixed(2)}</span>
        </div>

        <div className="editor-inspector-label">배회 반경</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="range"
            min="50"
            max="300"
            step="10"
            value={selection.wanderRadius}
            onChange={(e) => onNpcChange({ wanderRadius: parseInt(e.target.value, 10) })}
            style={{ flex: 1, accentColor: '#C4A35A', height: 4 }}
          />
          <span className="editor-inspector-value">{selection.wanderRadius}</span>
        </div>

        <button className="editor-btn danger" onClick={onDelete}>삭제</button>
      </div>
    );
  }

  if (selection.kind === 'spawn') {
    const onReset = () => editorBridge.emit('ed:spawn:clear');
    return (
      <div className="editor-inspector">
        <div className="editor-palette-header">영웅 스폰</div>
        <div className="editor-inspector-label">상태</div>
        <div className="editor-inspector-value">
          {selection.isSet ? '사용자 지정' : '기본값 (설정 안 됨)'}
        </div>
        <div className="editor-inspector-label">위치</div>
        <div className="editor-inspector-value">
          {Math.round(selection.x)}, {Math.round(selection.y)}
        </div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
          영웅은 첫 건물로 이동하기 전에 이곳에 나타납니다. 위치를 옮기려면 🚩 도구를 사용하세요.
        </div>
        {selection.isSet && (
          <button className="editor-btn" onClick={onReset} style={{ marginTop: 8 }}>
            기본값으로 초기화
          </button>
        )}
      </div>
    );
  }

  // path
  return (
    <div className="editor-inspector">
      <div className="editor-palette-header">길</div>
      <div className="editor-inspector-label">아이디</div>
      <div className="editor-inspector-value" style={{ fontSize: 10 }}>{selection.id}</div>
      <div className="editor-inspector-label">스타일</div>
      <div className="editor-inspector-value">{selection.style}</div>
      <div className="editor-inspector-label">점 개수</div>
      <div className="editor-inspector-value">{selection.pointCount}</div>
      <div className="editor-inspector-label">너비</div>
      <div className="editor-inspector-value">{selection.width}</div>
      <button className="editor-btn danger" onClick={onDelete}>삭제</button>
    </div>
  );
}
