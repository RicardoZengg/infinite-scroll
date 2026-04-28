import { useEffect } from "react";

type ShortcutHandlers = {
  onAddRow: () => void;
  onDuplicateCell: () => void;
  onCloseCell: () => void;
  onFocusLeft: () => void;
  onFocusRight: () => void;
  onFocusUp: () => void;
  onFocusDown: () => void;
  onToggleHelp: () => void;
  onFontIncrease: () => void;
  onFontDecrease: () => void;
};

const isEditableTarget = (eventTarget: EventTarget | null): boolean => {
  if (!(eventTarget instanceof HTMLElement)) {
    return false;
  }

  if (eventTarget.isContentEditable) {
    return true;
  }

  const tag = eventTarget.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
};

export const useShortcuts = ({
  onAddRow,
  onDuplicateCell,
  onCloseCell,
  onFocusLeft,
  onFocusRight,
  onFocusUp,
  onFocusDown,
  onToggleHelp,
  onFontIncrease,
  onFontDecrease,
}: ShortcutHandlers): void => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const editable = isEditableTarget(event.target);
      const key = event.key;

      if (editable && key !== "/" && key !== "?") {
        return;
      }

      if (event.shiftKey && key === "ArrowDown") {
        event.preventDefault();
        onAddRow();
        return;
      }

      if (!event.shiftKey && key.toLowerCase() === "d") {
        event.preventDefault();
        onDuplicateCell();
        return;
      }

      if (!event.shiftKey && key.toLowerCase() === "w") {
        event.preventDefault();
        onCloseCell();
        return;
      }

      if (!event.shiftKey && key === "ArrowLeft") {
        event.preventDefault();
        onFocusLeft();
        return;
      }

      if (!event.shiftKey && key === "ArrowRight") {
        event.preventDefault();
        onFocusRight();
        return;
      }

      if (!event.shiftKey && key === "ArrowUp") {
        event.preventDefault();
        onFocusUp();
        return;
      }

      if (!event.shiftKey && key === "ArrowDown") {
        event.preventDefault();
        onFocusDown();
        return;
      }

      if (key === "/" || key === "?") {
        event.preventDefault();
        onToggleHelp();
        return;
      }

      if (key === "=" || key === "+") {
        event.preventDefault();
        onFontIncrease();
        return;
      }

      if (key === "-") {
        event.preventDefault();
        onFontDecrease();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    onAddRow,
    onCloseCell,
    onDuplicateCell,
    onFocusDown,
    onFocusLeft,
    onFocusRight,
    onFocusUp,
    onFontDecrease,
    onFontIncrease,
    onToggleHelp,
  ]);
};
