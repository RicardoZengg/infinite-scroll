import type { AppTexts } from "../i18n";
import styles from "./HelpOverlay.module.css";

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
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={texts.shortcutsTitle}>
      <div className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{texts.shortcutsTitle}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={texts.closeHelpOverlay}>
            {texts.closeHelpOverlay}
          </button>
        </header>
        <ul className={styles.shortcutList}>
          {texts.shortcutRows.map(({ key, description }) => (
            <li key={key} className={styles.shortcutItem}>
              <kbd>{key}</kbd>
              <span className={styles.shortcutDesc}>{description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
