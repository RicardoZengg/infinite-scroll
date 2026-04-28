import { memo, useCallback } from "react";

import { useTerminalSession } from "../hooks/useTerminalSession";
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
      className={`cell terminal-cell ${isFocused ? "is-focused" : ""}`}
      onMouseDown={() => onFocus(cell.id)}
      data-testid={`terminal-cell-${cell.id}`}
    >
      <header>
        <span>{texts.terminal}</span>
        <small>{status}</small>
      </header>

      {status === "running" ? (
        <div className="terminal-host" ref={hostRef} aria-label={`${texts.terminal} ${cell.id}`} />
      ) : (
        <div className="terminal-fallback">
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
