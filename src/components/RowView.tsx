import { memo, useCallback, useRef, useState } from "react";

import { NotesCell } from "./NotesCell";
import { TerminalCell } from "./TerminalCell";
import styles from "./RowView.module.css";
import type { Row, TerminalStatus } from "../types/workspace";
import type { AppTexts } from "../i18n";

type RowViewProps = {
  row: Row;
  rowIndex: number;
  focusedCellIdInRow: string | null;
  fontSize: number;
  isSingleRow: boolean;
  onFocusCell: (cellId: string) => void;
  onCloseFocusedCell: () => void;
  onAddNotesToRow: (rowId: string) => void;
  onUpdateNotes: (cellId: string, text: string) => void;
  onTerminalStatusChange: (cellId: string, status: TerminalStatus) => void;
  onTerminalCwdChange: (cellId: string, cwd: string) => void;
  onMoveRow: (fromIndex: number, toIndex: number) => void;
  onRenameRow: (rowId: string, title: string) => void;
  texts: AppTexts;
};

export const RowView = memo(function RowView({
  row,
  rowIndex,
  focusedCellIdInRow,
  fontSize,
  isSingleRow,
  onFocusCell,
  onCloseFocusedCell,
  onAddNotesToRow,
  onUpdateNotes,
  onTerminalStatusChange,
  onTerminalCwdChange,
  onMoveRow,
  onRenameRow,
  texts,
}: RowViewProps) {
  const dragRef = useRef<number>(rowIndex);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(row.title);

  const handleDoubleClick = useCallback(() => {
    setEditValue(row.title);
    setIsEditing(true);
  }, [row.title]);

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== row.title) {
      onRenameRow(row.id, trimmed);
    }
    setIsEditing(false);
  }, [editValue, row.id, row.title, onRenameRow]);

  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      dragRef.current = rowIndex;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(rowIndex));
    },
    [rowIndex],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const fromIndex = Number(e.dataTransfer.getData("text/plain"));
      if (!Number.isNaN(fromIndex) && fromIndex !== rowIndex) {
        onMoveRow(fromIndex, rowIndex);
      }
    },
    [onMoveRow, rowIndex],
  );

  return (
    <section
      className={`${styles.row}${isSingleRow ? ` ${styles.singleRow}` : ""}`}
      data-testid={`row-${row.id}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className={styles.rowHeader}>
        <div
          className={styles.dragHandle}
          draggable
          onDragStart={onDragStart}
          title="Drag to reorder"
          aria-label={`Drag to reorder ${row.title}`}
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.2" /><circle cx="11" cy="3" r="1.2" />
            <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
            <circle cx="5" cy="13" r="1.2" /><circle cx="11" cy="13" r="1.2" />
          </svg>
        </div>
        {isEditing ? (
          <input
            className={styles.rowTitleInput}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            autoFocus
          />
        ) : (
          <h3 className={styles.rowTitle} onDoubleClick={handleDoubleClick} title="Double-click to rename">
            {row.title}
          </h3>
        )}
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
