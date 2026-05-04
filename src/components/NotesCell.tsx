import { memo } from "react";

import type { NotesCell as NotesCellModel } from "../types/workspace";
import type { AppTexts } from "../i18n";
import styles from "./NotesCell.module.css";

type NotesCellProps = {
  cell: NotesCellModel;
  isFocused: boolean;
  fontSize: number;
  onFocus: (cellId: string) => void;
  onChange: (cellId: string, text: string) => void;
  texts: AppTexts;
};

export const NotesCell = memo(function NotesCell({
  cell,
  isFocused,
  fontSize,
  onFocus,
  onChange,
  texts,
}: NotesCellProps) {
  return (
    <article
      className={`${styles.cell}${isFocused ? ` ${styles.focused}` : ""}`}
      onMouseDown={() => onFocus(cell.id)}
      data-testid={`notes-cell-${cell.id}`}
    >
      <header className={styles.cellHeader}>
        <span className={styles.noteIcon} />
        <span className={styles.cellLabel}>{texts.notes}</span>
      </header>
      <textarea
        className={styles.textarea}
        value={cell.text}
        onFocus={() => onFocus(cell.id)}
        onChange={(event) => onChange(cell.id, event.target.value)}
        style={{ fontSize }}
        spellCheck={false}
        aria-label={`${texts.notes} ${cell.id}`}
      />
    </article>
  );
});
