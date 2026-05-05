import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

type TerminalBridgeOptions = {
  fontSize: number;
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
};

export type TerminalBridge = {
  mount: (host: HTMLElement) => void;
  write: (data: string) => void;
  setFontSize: (fontSize: number) => void;
  dispose: () => void;
};

export const createTerminalBridge = (options: TerminalBridgeOptions): TerminalBridge => {
  const terminal = new Terminal({
    fontFamily: "Consolas, 'Cascadia Mono', 'Courier New', monospace",
    fontSize: options.fontSize,
    convertEol: true,
    cursorBlink: true,
    allowProposedApi: true,
    theme: {
      background: "#0f172a",
      foreground: "#dbeafe",
      cursor: "#38bdf8",
      selectionBackground: "#1d4ed8",
    },
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  const inputDisposable = terminal.onData((data) => {
    options.onInput(data);
  });

  let pendingResize: { cols: number; rows: number } | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let lastReportedResize: { cols: number; rows: number } | null = null;

  const flushResize = () => {
    resizeTimer = null;
    if (!pendingResize) {
      return;
    }

    const { cols, rows } = pendingResize;
    pendingResize = null;

    if (lastReportedResize && lastReportedResize.cols === cols && lastReportedResize.rows === rows) {
      return;
    }

    lastReportedResize = { cols, rows };
    options.onResize(cols, rows);
  };

  const scheduleResizeNotification = (cols: number, rows: number) => {
    pendingResize = { cols, rows };
    if (resizeTimer) {
      return;
    }

    resizeTimer = setTimeout(flushResize, 60);
  };

  const resizeDisposable = terminal.onResize(({ cols, rows }) => {
    scheduleResizeNotification(cols, rows);
  });

  const fitAndNotify = () => {
    fitAddon.fit();
    scheduleResizeNotification(terminal.cols, terminal.rows);
  };

  const onWindowResize = () => {
    fitAndNotify();
  };

  let mountedHost: HTMLElement | null = null;
  const detachHostHandlers = () => {
    if (!mountedHost) {
      return;
    }

    mountedHost.removeEventListener("wheel", stopWheelBubbling);
    mountedHost.removeEventListener("pointerdown", focusTerminal);
  };

  const stopWheelBubbling = (event: WheelEvent) => {
    event.stopPropagation();
  };

  const focusTerminal = () => {
    terminal.focus();
  };

  let writeBuffer = "";
  let writeTimer: ReturnType<typeof setTimeout> | null = null;

  const flushWriteBuffer = () => {
    writeTimer = null;
    if (writeBuffer.length > 0) {
      const chunk = writeBuffer;
      writeBuffer = "";
      terminal.write(chunk);
    }
  };

  const scheduleWrite = (data: string) => {
    writeBuffer += data;
    if (writeBuffer.length >= 4096) {
      if (writeTimer) {
        clearTimeout(writeTimer);
        writeTimer = null;
      }
      flushWriteBuffer();
      return;
    }
    if (!writeTimer) {
      writeTimer = setTimeout(flushWriteBuffer, 8);
    }
  };

  return {
    mount: (host) => {
      if (mountedHost === host) {
        fitAndNotify();
        return;
      }

      detachHostHandlers();
      mountedHost = host;
      terminal.open(host);
      fitAndNotify();
      host.addEventListener("wheel", stopWheelBubbling, { passive: true });
      host.addEventListener("pointerdown", focusTerminal);
      window.addEventListener("resize", onWindowResize);
    },
    write: (data) => {
      scheduleWrite(data);
    },
    setFontSize: (fontSize) => {
      terminal.options.fontSize = fontSize;
      if (mountedHost) {
        fitAndNotify();
      }
    },
    dispose: () => {
      if (writeTimer) {
        clearTimeout(writeTimer);
        writeTimer = null;
      }
      if (writeBuffer.length > 0) {
        terminal.write(writeBuffer);
        writeBuffer = "";
      }
      if (resizeTimer) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
      }
      detachHostHandlers();
      mountedHost = null;
      window.removeEventListener("resize", onWindowResize);
      inputDisposable.dispose();
      resizeDisposable.dispose();
      terminal.dispose();
    },
  };
};
