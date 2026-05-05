import { useCallback, useEffect, useRef } from "react";

import styles from "./SearchPanel.module.css";

type SearchPanelProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
};

export function SearchPanel({ query, onQueryChange, onClose }: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(e.target.value);
    },
    [onQueryChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div className={styles.searchBar} data-testid="search-panel">
      <svg className={styles.searchIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10" y1="10" x2="14" y2="14" />
      </svg>
      <input
        ref={inputRef}
        className={styles.searchInput}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search rows by title or CWD..."
        aria-label="Search rows"
      />
      <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close search">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
        </svg>
      </button>
    </div>
  );
}
