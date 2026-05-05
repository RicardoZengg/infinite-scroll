import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { VariableSizeList, type ListChildComponentProps } from "react-window";

import type { AppTexts } from "../i18n";
import styles from "./WorkspaceCanvas.module.css";
import { useElementSize } from "../hooks/useElementSize";
import { useShortcuts } from "../hooks/useShortcuts";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import type { Row, TerminalStatus } from "../types/workspace";
import { RowView } from "./RowView";
import { SearchPanel } from "./SearchPanel";

type WorkspaceCanvasProps = {
  texts: AppTexts;
  onActiveRowIdsChange?: (rowIds: string[]) => void;
};

type RowItemData = {
  rows: Row[];
  focusedCellId: string | null;
  fontSize: number;
  texts: AppTexts;
  isSingleRow: boolean;
  onFocusCell: (cellId: string) => void;
  onCloseFocusedCell: () => void;
  onAddNotesToRow: (rowId: string) => void;
  onUpdateNotes: (cellId: string, text: string) => void;
  onTerminalStatusChange: (cellId: string, status: TerminalStatus) => void;
  onTerminalCwdChange: (cellId: string, cwd: string) => void;
  onMoveRow: (fromIndex: number, toIndex: number) => void;
  onRenameRow: (rowId: string, title: string) => void;
};

const getColumnCount = (width: number): number => {
  if (width >= 1280) {
    return 3;
  }
  if (width >= 880) {
    return 2;
  }
  return 1;
};

const estimateRowHeight = (
  row: Row,
  width: number,
  viewportHeight: number,
  isSingleRow: boolean,
): number => {
  const columns = getColumnCount(width);
  const rowLines = Math.ceil(row.cells.length / columns);
  const baseCellHeight = isSingleRow
    ? Math.max(460, Math.min(viewportHeight - 250, 900))
    : 320;
  const rowHeader = 56;
  const rowPadding = 24;
  const rowGap = 10;

  return rowHeader + rowPadding + rowLines * baseCellHeight + Math.max(0, rowLines - 1) * rowGap;
};

const RowItem = memo(({ index, style, data }: ListChildComponentProps<RowItemData>) => {
  const row = data.rows[index];
  const focusedCellIdInRow = row.cells.some((cell) => cell.id === data.focusedCellId)
    ? data.focusedCellId
    : null;

  return (
    <div style={style} className={styles.virtualRowShell}>
      <RowView
        row={row}
        rowIndex={index}
        focusedCellIdInRow={focusedCellIdInRow}
        fontSize={data.fontSize}
        isSingleRow={data.isSingleRow}
        onFocusCell={data.onFocusCell}
        onCloseFocusedCell={data.onCloseFocusedCell}
        onAddNotesToRow={data.onAddNotesToRow}
        onUpdateNotes={data.onUpdateNotes}
        onTerminalStatusChange={data.onTerminalStatusChange}
        onTerminalCwdChange={data.onTerminalCwdChange}
        onMoveRow={data.onMoveRow}
        onRenameRow={data.onRenameRow}
        texts={data.texts}
      />
    </div>
  );
});

export function WorkspaceCanvas({ texts, onActiveRowIdsChange }: WorkspaceCanvasProps) {
  const rows = useWorkspaceStore((state) => state.rows);
  const focusedCellId = useWorkspaceStore((state) => state.focusedCellId);
  const fontSize = useWorkspaceStore((state) => state.fontSize);
  const searchQuery = useWorkspaceStore((state) => state.searchQuery);
  const isSearchOpen = useWorkspaceStore((state) => state.isSearchOpen);

  const addRowBelowFocused = useWorkspaceStore((state) => state.addRowBelowFocused);
  const duplicateFocusedTerminal = useWorkspaceStore((state) => state.duplicateFocusedTerminal);
  const addNotesToFocusedRow = useWorkspaceStore((state) => state.addNotesToFocusedRow);
  const closeCell = useWorkspaceStore((state) => state.closeCell);
  const setFocusedCellId = useWorkspaceStore((state) => state.setFocusedCellId);
  const focusLeft = useWorkspaceStore((state) => state.focusLeft);
  const focusRight = useWorkspaceStore((state) => state.focusRight);
  const focusUp = useWorkspaceStore((state) => state.focusUp);
  const focusDown = useWorkspaceStore((state) => state.focusDown);
  const updateNotesCell = useWorkspaceStore((state) => state.updateNotesCell);
  const setTerminalStatus = useWorkspaceStore((state) => state.setTerminalStatus);
  const setTerminalCwd = useWorkspaceStore((state) => state.setTerminalCwd);
  const toggleHelp = useWorkspaceStore((state) => state.toggleHelp);
  const adjustFontSize = useWorkspaceStore((state) => state.adjustFontSize);
  const moveRow = useWorkspaceStore((state) => state.moveRow);
  const renameRow = useWorkspaceStore((state) => state.renameRow);
  const setSearchQuery = useWorkspaceStore((state) => state.setSearchQuery);
  const toggleSearch = useWorkspaceStore((state) => state.toggleSearch);
  const closeSearch = useWorkspaceStore((state) => state.closeSearch);

  const { ref: viewportRef, size } = useElementSize();
  const listRef = useRef<VariableSizeList<RowItemData> | null>(null);

  const isTerminalCell = (cell: { type: string }): cell is { type: "terminal"; cwd: string } =>
    cell.type === "terminal";

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) => {
      if (row.title.toLowerCase().includes(q)) return true;
      return row.cells.some(
        (cell) => isTerminalCell(cell) && cell.cwd.toLowerCase().includes(q),
      );
    });
  }, [rows, searchQuery]);

  useShortcuts({
    onAddRow: addRowBelowFocused,
    onDuplicateCell: duplicateFocusedTerminal,
    onCloseCell: () => closeCell(),
    onFocusLeft: focusLeft,
    onFocusRight: focusRight,
    onFocusUp: focusUp,
    onFocusDown: focusDown,
    onToggleHelp: toggleHelp,
    onFontIncrease: () => adjustFontSize(1),
    onFontDecrease: () => adjustFontSize(-1),
    onToggleSearch: toggleSearch,
  });

  const onCloseFocusedCell = useCallback(() => {
    closeCell();
  }, [closeCell]);

  const onAddNotesToRow = useCallback(
    (rowId: string) => {
      const row = rows.find((candidate) => candidate.id === rowId);
      if (!row || row.cells.length === 0) {
        return;
      }

      if (!row.cells.some((cell) => cell.id === focusedCellId)) {
        setFocusedCellId(row.cells[0].id);
      }
      addNotesToFocusedRow();
    },
    [addNotesToFocusedRow, focusedCellId, rows, setFocusedCellId],
  );

  const rowHeights = useMemo(
    () =>
      filteredRows.map((row) => estimateRowHeight(row, size.width, size.height, filteredRows.length === 1)),
    [filteredRows, size.height, size.width],
  );

  const getItemSize = useCallback((index: number) => rowHeights[index] ?? 420, [rowHeights]);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0, true);
  }, [rowHeights]);

  const focusedRowIndex = useMemo(() => {
    if (!focusedCellId) {
      return -1;
    }

    return filteredRows.findIndex((row) => row.cells.some((cell) => cell.id === focusedCellId));
  }, [focusedCellId, filteredRows]);

  useEffect(() => {
    if (focusedRowIndex >= 0) {
      listRef.current?.scrollToItem(focusedRowIndex, "smart");
    }
  }, [focusedRowIndex]);

  const itemData = useMemo<RowItemData>(
    () => ({
      rows: filteredRows,
      focusedCellId,
      fontSize,
      texts,
      isSingleRow: filteredRows.length === 1,
      onFocusCell: setFocusedCellId,
      onCloseFocusedCell,
      onAddNotesToRow,
      onUpdateNotes: updateNotesCell,
      onTerminalStatusChange: setTerminalStatus,
      onTerminalCwdChange: setTerminalCwd,
      onMoveRow: moveRow,
      onRenameRow: renameRow,
    }),
    [
      filteredRows,
      focusedCellId,
      fontSize,
      texts,
      setFocusedCellId,
      filteredRows.length,
      onCloseFocusedCell,
      onAddNotesToRow,
      updateNotesCell,
      setTerminalStatus,
      setTerminalCwd,
      moveRow,
      renameRow,
    ],
  );

  const itemKey = useCallback((index: number, data: RowItemData) => data.rows[index].id, []);

  const handleItemsRendered = useCallback(
    ({
      overscanStartIndex,
      overscanStopIndex,
    }: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => {
      if (!onActiveRowIdsChange) {
        return;
      }

      const activeIds = filteredRows
        .slice(
          Math.max(0, overscanStartIndex),
          Math.min(filteredRows.length, overscanStopIndex + 1),
        )
        .map((row) => row.id);
      onActiveRowIdsChange(activeIds);
    },
    [onActiveRowIdsChange, filteredRows],
  );

  return (
    <div
      className={`${styles.canvas}${filteredRows.length === 1 ? ` ${styles.singleRow}` : ""}`}
      data-testid="workspace-canvas"
      ref={viewportRef}
    >
      {isSearchOpen && (
        <SearchPanel query={searchQuery} onQueryChange={setSearchQuery} onClose={closeSearch} />
      )}
      <VariableSizeList<RowItemData>
        className={styles.virtualList}
        ref={listRef}
        width={size.width}
        height={isSearchOpen ? size.height - 48 : size.height}
        itemCount={filteredRows.length}
        itemSize={getItemSize}
        itemData={itemData}
        itemKey={itemKey}
        overscanCount={1}
        onItemsRendered={handleItemsRendered}
      >
        {RowItem}
      </VariableSizeList>
    </div>
  );
}
