import { useCallback, useEffect, useMemo, useRef } from "react";
import { VariableSizeList, type ListChildComponentProps } from "react-window";

import type { AppTexts } from "../i18n";
import styles from "./WorkspaceCanvas.module.css";
import { useElementSize } from "../hooks/useElementSize";
import { useShortcuts } from "../hooks/useShortcuts";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import type { Row, TerminalStatus } from "../types/workspace";
import { RowView } from "./RowView";

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

const RowItem = ({ index, style, data }: ListChildComponentProps<RowItemData>) => {
  const row = data.rows[index];
  const focusedCellIdInRow = row.cells.some((cell) => cell.id === data.focusedCellId)
    ? data.focusedCellId
    : null;

  return (
    <div style={style} className={styles.virtualRowShell}>
      <RowView
        row={row}
        focusedCellIdInRow={focusedCellIdInRow}
        fontSize={data.fontSize}
        isSingleRow={data.isSingleRow}
        onFocusCell={data.onFocusCell}
        onCloseFocusedCell={data.onCloseFocusedCell}
        onAddNotesToRow={data.onAddNotesToRow}
        onUpdateNotes={data.onUpdateNotes}
        onTerminalStatusChange={data.onTerminalStatusChange}
        onTerminalCwdChange={data.onTerminalCwdChange}
        texts={data.texts}
      />
    </div>
  );
};

export function WorkspaceCanvas({ texts, onActiveRowIdsChange }: WorkspaceCanvasProps) {
  const rows = useWorkspaceStore((state) => state.rows);
  const focusedCellId = useWorkspaceStore((state) => state.focusedCellId);
  const fontSize = useWorkspaceStore((state) => state.fontSize);

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

  const { ref: viewportRef, size } = useElementSize();
  const listRef = useRef<VariableSizeList<RowItemData> | null>(null);

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
      rows.map((row) => estimateRowHeight(row, size.width, size.height, rows.length === 1)),
    [rows, size.height, size.width],
  );

  const getItemSize = useCallback((index: number) => rowHeights[index] ?? 420, [rowHeights]);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0, true);
  }, [rowHeights]);

  const focusedRowIndex = useMemo(() => {
    if (!focusedCellId) {
      return -1;
    }

    return rows.findIndex((row) => row.cells.some((cell) => cell.id === focusedCellId));
  }, [focusedCellId, rows]);

  useEffect(() => {
    if (focusedRowIndex >= 0) {
      listRef.current?.scrollToItem(focusedRowIndex, "smart");
    }
  }, [focusedRowIndex]);

  const itemData = useMemo<RowItemData>(
    () => ({
      rows,
      focusedCellId,
      fontSize,
      texts,
      isSingleRow: rows.length === 1,
      onFocusCell: setFocusedCellId,
      onCloseFocusedCell,
      onAddNotesToRow,
      onUpdateNotes: updateNotesCell,
      onTerminalStatusChange: setTerminalStatus,
      onTerminalCwdChange: setTerminalCwd,
    }),
    [
      rows,
      focusedCellId,
      fontSize,
      texts,
      setFocusedCellId,
      rows.length,
      onCloseFocusedCell,
      onAddNotesToRow,
      updateNotesCell,
      setTerminalStatus,
      setTerminalCwd,
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

      const activeIds = rows
        .slice(
          Math.max(0, overscanStartIndex),
          Math.min(rows.length, overscanStopIndex + 1),
        )
        .map((row) => row.id);
      onActiveRowIdsChange(activeIds);
    },
    [onActiveRowIdsChange, rows],
  );

  return (
    <div
      className={`${styles.canvas}${rows.length === 1 ? ` ${styles.singleRow}` : ""}`}
      data-testid="workspace-canvas"
      ref={viewportRef}
    >
      <VariableSizeList<RowItemData>
        className={styles.virtualList}
        ref={listRef}
        width={size.width}
        height={size.height}
        itemCount={rows.length}
        itemSize={getItemSize}
        itemData={itemData}
        itemKey={itemKey}
        onItemsRendered={handleItemsRendered}
      >
        {RowItem}
      </VariableSizeList>
    </div>
  );
}
