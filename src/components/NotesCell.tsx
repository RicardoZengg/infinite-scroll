import { memo } from "react";

import type { NotesCell as NotesCellModel } from "../types/workspace";
import type { AppTexts } from "../i18n";

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
      className={`cell notes-cell ${isFocused ? "is-focused" : ""}`}
      onMouseDown={() => onFocus(cell.id)}
      data-testid={`notes-cell-${cell.id}`}
    >
      <header>
        <span>{texts.notes}</span>
      </header>
      <textarea
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
