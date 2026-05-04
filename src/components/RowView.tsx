import { memo } from "react";

import { NotesCell } from "./NotesCell";
import { TerminalCell } from "./TerminalCell";
import styles from "./RowView.module.css";
import type { Row, TerminalStatus } from "../types/workspace";
import type { AppTexts } from "../i18n";

type RowViewProps = {
  row: Row;
  focusedCellIdInRow: string | null;
  fontSize: number;
  isSingleRow: boolean;
  onFocusCell: (cellId: string) => void;
  onCloseFocusedCell: () => void;
  onAddNotesToRow: (rowId: string) => void;
  onUpdateNotes: (cellId: string, text: string) => void;
  onTerminalStatusChange: (cellId: string, status: TerminalStatus) => void;
  onTerminalCwdChange: (cellId: string, cwd: string) => void;
  texts: AppTexts;
};

export const RowView = memo(function RowView({
  row,
  focusedCellIdInRow,
  fontSize,
  isSingleRow,
  onFocusCell,
  onCloseFocusedCell,
  onAddNotesToRow,
  onUpdateNotes,
  onTerminalStatusChange,
  onTerminalCwdChange,
  texts,
}: RowViewProps) {
  return (
    <section className={`${styles.row}${isSingleRow ? ` ${styles.singleRow}` : ""}`} data-testid={`row-${row.id}`}>
      <header className={styles.rowHeader}>
        <h3 className={styles.rowTitle}>{row.title}</h3>
        <div className={styles.rowActions}>
          <button
            type="button"
            onClick={() => {
            onAddNotesToRow(row.id);
          }}
          >
            {texts.addNote}
          </button>
          <button type="button" onClick={onCloseFocusedCell}>
            {texts.closeFocused}
          </button>
        </div>
      </header>

      <div className={styles.rowCells}>
        {row.cells.map((cell) =>
          cell.type === "terminal" ? (
            <TerminalCell
              key={cell.id}
              cell={cell}
              isFocused={focusedCellIdInRow === cell.id}
              fontSize={fontSize}
              onFocus={onFocusCell}
              onStatusChange={onTerminalStatusChange}
              onCwdChange={onTerminalCwdChange}
              texts={texts}
            />
          ) : (
            <NotesCell
              key={cell.id}
              cell={cell}
              isFocused={focusedCellIdInRow === cell.id}
              fontSize={fontSize}
              onFocus={onFocusCell}
              onChange={onUpdateNotes}
              texts={texts}
            />
          ),
        )}
      </div>
    </section>
  );
});
