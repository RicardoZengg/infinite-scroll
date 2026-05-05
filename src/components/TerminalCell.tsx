import { memo, useCallback } from "react";

import { useTerminalSession } from "../hooks/useTerminalSession";
import styles from "./TerminalCell.module.css";
import type { TerminalCell as TerminalCellModel, TerminalStatus } from "../types/workspace";
import type { AppTexts } from "../i18n";

type TerminalCellProps = {
  cell: TerminalCellModel;
  isFocused: boolean;
  fontSize: number;
  onFocus: (cellId: string) => void;
  onStatusChange: (cellId: string, status: TerminalStatus) => void;
  onCwdChange: (cellId: string, cwd: string) => void;
  texts: AppTexts;
};

export const TerminalCell = memo(function TerminalCell({
  cell,
  isFocused,
  fontSize,
  onFocus,
  onStatusChange,
  onCwdChange,
  texts,
}: TerminalCellProps) {
  const onSessionStatusChange = useCallback(
    (status: TerminalStatus) => {
      onStatusChange(cell.id, status);
    },
    [cell.id, onStatusChange],
  );

  const onSessionCwdChange = useCallback(
    (cwd: string) => {
      onCwdChange(cell.id, cwd);
    },
    [cell.id, onCwdChange],
  );

  const { hostRef, status, errorMessage, restart } = useTerminalSession({
    cellId: cell.id,
    fontSize,
    initialStatus: cell.status,
    onStatusChange: onSessionStatusChange,
    onCwdChange: onSessionCwdChange,
  });

  return (
    <article
      className={`${styles.cell}${isFocused ? ` ${styles.focused}` : ""}`}
      onMouseDown={() => onFocus(cell.id)}
      data-testid={`terminal-cell-${cell.id}`}
    >
      <header className={styles.cellHeader}>
        <div className={styles.cellHeaderLeft}>
          <span className={`${styles.statusDot} ${styles[status] ?? ""}`} />
          <span className={styles.cellLabel}>{texts.terminal}</span>
          {cell.cwd ? <span className={styles.cwdPath} title={cell.cwd}>{cell.cwd}</span> : null}
        </div>
        <small className={styles.statusLabel}>{status}</small>
      </header>

      {status === "running" ? (
        <div className={styles.terminalHost} ref={hostRef} aria-label={`${texts.terminal} ${cell.id}`} />
      ) : (
        <div className={styles.fallback}>
          <p>{status === "error" ? texts.terminalStartFailed : texts.terminalExited}</p>
          {errorMessage ? <code>{errorMessage}</code> : null}
          <button
            type="button"
            onClick={() => {
              void restart();
            }}
          >
            {texts.restart}
          </button>
        </div>
      )}
    </article>
  );
});
