import { useEffect } from "react";

import type { AppTexts } from "../i18n";
import styles from "./HelpOverlay.module.css";

type HelpOverlayProps = {
  open: boolean;
  onClose: () => void;
  texts: AppTexts;
};

export function HelpOverlay({ open, onClose, texts }: HelpOverlayProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={texts.shortcutsTitle} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{texts.shortcutsTitle}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={texts.closeHelpOverlay}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
            </svg>
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
        <footer className={styles.panelFooter}>
          <kbd>Esc</kbd>
          <span className={styles.shortcutDesc}>{texts.closeHelpOverlay}</span>
        </footer>
      </div>
    </div>
  );
}
