import { editorStore, useEditorStore } from '../state/editor-store';

/**
 * Non-blocking banner that appears at the top of the editor when one or
 * more textures failed to load during boot. The editor stays fully usable
 * — the banner just tells the user which *kind* of assets are missing and
 * points to a restore command. Dismissible per session.
 */
export function AssetWarningBanner() {
  const errors = useEditorStore((s) => s.assetErrors);
  const dismissed = useEditorStore((s) => s.assetErrorsDismissed);

  if (errors === null || dismissed) return null;

  const MAX_SAMPLES = 4;
  const samples = errors.samples.slice(0, MAX_SAMPLES);
  const overflow = errors.total - samples.length;

  return (
    <div className="editor-asset-banner" role="alert">
      <div className="editor-asset-banner-head">
        <span className="editor-asset-banner-icon" aria-hidden>⚠</span>
        <span className="editor-asset-banner-title">
          에셋 {errors.total}개를 불러오지 못했습니다
        </span>
        <button
          className="editor-asset-banner-dismiss"
          type="button"
          onClick={() => editorStore.dismissAssetErrors()}
          aria-label="닫기"
        >
          ×
        </button>
      </div>
      <div className="editor-asset-banner-body">
        <ul className="editor-asset-banner-cats">
          {errors.categories.map((c) => (
            <li key={c.id}>
              <strong>{c.label}:</strong> {c.count}
            </li>
          ))}
        </ul>
        <details className="editor-asset-banner-details">
          <summary>누락된 파일 보기</summary>
          <ul>
            {samples.map((p) => (
              <li key={p}><code>{p}</code></li>
            ))}
            {overflow > 0 && <li>…외 {overflow}개</li>}
          </ul>
          <p className="editor-asset-banner-hint">
            <code>git checkout -- client/public/assets/themes/tiny-swords-cc0/</code> 명령으로 복원할 수 있습니다
          </p>
        </details>
      </div>
    </div>
  );
}
