import { editorBridge } from '../EditorBridge';
import { editorStore, useEditorStore } from '../state/editor-store';
import type { EraseScope, Layer, PathStyle } from '../types/editor-events';

const LAYERS: Array<{ key: Layer; label: string }> = [
  { key: 'terrain',     label: '지형' },
  { key: 'paths',       label: '길' },
  { key: 'decorations', label: '장식' },
  { key: 'buildings',   label: '건물' },
];

const PATH_STYLES: PathStyle[] = ['main', 'secondary', 'trail', 'plaza'];

const ERASE_SCOPES: EraseScope[] = ['all', 'terrain', 'decorations', 'paths'];

export function LayerPanel() {
  const layers = useEditorStore((s) => s.layers);
  const pathBrush = useEditorStore((s) => s.pathBrush);
  const paintTile = useEditorStore((s) => s.paintTile);
  const tool = useEditorStore((s) => s.tool);

  const onToggle = (layer: Layer) => {
    const next = !layers[layer];
    editorStore.toggleLayer(layer, next);
    editorBridge.emit('ed:layer:toggle', { layer, visible: next });
  };

  const onPathStyle = (style: PathStyle) => {
    editorStore.setPathBrush(style, pathBrush.width);
    editorBridge.emit('ed:path:style', { style, width: pathBrush.width });
  };

  const onPathWidth = (w: number) => {
    editorStore.setPathBrush(pathBrush.style, w);
    editorBridge.emit('ed:path:style', { style: pathBrush.style, width: w });
  };

  const onWalkable = (v: boolean) => {
    editorStore.setPaintTile(paintTile.tile, v);
    editorBridge.emit('ed:tile:set', { tile: paintTile.tile, walkable: v });
  };

  const onEraseScope = (scope: EraseScope) => {
    editorBridge.emit('ed:erase:scope', scope);
  };

  const onClear = (what: 'clear-terrain' | 'clear-decorations' | 'clear-paths' | 'reset-buildings') => {
    if (confirm(`"${what}" 작업을 실행하시겠습니까?`)) {
      editorBridge.emit('ed:action', what);
    }
  };

  return (
    <div className="editor-layers">
      <div className="editor-palette-header">레이어</div>
      {LAYERS.map((l) => (
        <div key={l.key} className="editor-row">
          <label>
            <input
              type="checkbox"
              checked={layers[l.key]}
              onChange={() => onToggle(l.key)}
            /> {l.label}
          </label>
        </div>
      ))}

      <div className="editor-palette-header" style={{ marginTop: 6 }}>길 브러시</div>
      <div className="editor-row">
        <label>스타일</label>
        <select value={pathBrush.style} onChange={(e) => onPathStyle(e.target.value as PathStyle)}>
          {PATH_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="editor-row">
        <label>너비 {pathBrush.width}</label>
        <input
          type="range"
          min={16}
          max={80}
          step={1}
          value={pathBrush.width}
          onChange={(e) => onPathWidth(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="editor-palette-header" style={{ marginTop: 6 }}>칠하기 브러시</div>
      <div className="editor-row">
        <label>
          <input type="checkbox" checked={paintTile.walkable} onChange={(e) => onWalkable(e.target.checked)} />
          {' '}통행 가능
        </label>
      </div>

      {tool === 'erase' && (
        <>
          <div className="editor-palette-header" style={{ marginTop: 6 }}>지우기 범위</div>
          <div className="editor-row">
            <select
              defaultValue="all"
              onChange={(e) => onEraseScope(e.target.value as EraseScope)}
              style={{ flex: 1 }}
            >
              {ERASE_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </>
      )}

      <div className="editor-palette-header" style={{ marginTop: 6 }}>비우기</div>
      <button className="editor-btn" onClick={() => onClear('clear-terrain')}>지형 비우기</button>
      <button className="editor-btn" onClick={() => onClear('clear-decorations')}>장식 비우기</button>
      <button className="editor-btn" onClick={() => onClear('clear-paths')}>길 비우기</button>
      <button className="editor-btn" onClick={() => onClear('reset-buildings')}>건물 초기화</button>
    </div>
  );
}
