import type { AppTexts } from "../i18n";

type HelpOverlayProps = {
  open: boolean;
  onClose: () => void;
  texts: AppTexts;
};

export function HelpOverlay({ open, onClose, texts }: HelpOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-label={texts.shortcutsTitle}>
      <div className="help-panel">
        <header>
          <h2>{texts.shortcutsTitle}</h2>
          <button type="button" onClick={onClose} aria-label={texts.closeHelpOverlay}>
            {texts.closeHelpOverlay}
          </button>
        </header>
        <ul>
          {texts.shortcutRows.map(({ key, description }) => (
            <li key={key}>
              <kbd>{key}</kbd>
              <span>{description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
