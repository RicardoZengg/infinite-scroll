import { useCallback, useEffect, useRef, useState } from "react";

import {
  restartTerminalSession,
  resizeTerminal,
  subscribeTerminalCwd,
  subscribeTerminalOutput,
  subscribeTerminalStatus,
  writeTerminalInput,
} from "../lib/tauri";
import { createInputBatcher, type InputBatcher } from "../lib/inputBatcher";
import type { TerminalStatus } from "../types/workspace";
import type { TerminalBridge } from "../lib/terminalBridge";

type UseTerminalSessionOptions = {
  cellId: string;
  fontSize: number;
  initialStatus: TerminalStatus;
  onStatusChange: (status: TerminalStatus) => void;
  onCwdChange: (cwd: string) => void;
};

type UseTerminalSessionResult = {
  hostRef: (node: HTMLDivElement | null) => void;
  status: TerminalStatus;
  errorMessage: string | null;
  restart: () => Promise<void>;
};

export const useTerminalSession = ({
  cellId,
  fontSize,
  initialStatus,
  onStatusChange,
  onCwdChange,
}: UseTerminalSessionOptions): UseTerminalSessionResult => {
  const [status, setStatus] = useState<TerminalStatus>(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hostElementRef = useRef<HTMLDivElement | null>(null);
  const bridgeRef = useRef<TerminalBridge | null>(null);
  const inputBatcherRef = useRef<InputBatcher | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const onCwdChangeRef = useRef(onCwdChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onCwdChangeRef.current = onCwdChange;
  }, [onCwdChange]);

  const setHostRef = useCallback((node: HTMLDivElement | null) => {
    hostElementRef.current = node;
    if (node && bridgeRef.current) {
      bridgeRef.current.mount(node);
    }
  }, []);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    let active = true;
    const inputBatcher = createInputBatcher({
      flush: (chunk) => writeTerminalInput({ cellId, data: chunk }),
      intervalMs: 10,
      maxBatchSize: 1024,
    });
    inputBatcherRef.current = inputBatcher;

    void import("../lib/terminalBridge").then(({ createTerminalBridge }) => {
      if (!active) {
        return;
      }

      const bridge = createTerminalBridge({
        fontSize,
        onInput: (data) => {
          inputBatcher.push(data);
        },
        onResize: (cols, rows) => {
          void resizeTerminal({ cellId, cols, rows });
        },
      });
      bridgeRef.current = bridge;
      if (hostElementRef.current) {
        bridge.mount(hostElementRef.current);
      }
    });

    return () => {
      active = false;
      inputBatcher.flushNow();
      inputBatcher.dispose();
      inputBatcherRef.current = null;
      bridgeRef.current?.dispose();
      bridgeRef.current = null;
    };
  }, [cellId]);

  useEffect(() => {
    bridgeRef.current?.setFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    let isMounted = true;

    const syncStatus = (nextStatus: TerminalStatus, nextError: string | null = null) => {
      if (!isMounted) {
        return;
      }

      setStatus(nextStatus);
      setErrorMessage(nextError);
      onStatusChangeRef.current(nextStatus);
    };

    if (initialStatus === "running") {
      syncStatus("running");
    }

    let unlistenOutput: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;
    let unlistenCwd: (() => void) | undefined;

    void subscribeTerminalOutput(cellId, (event) => {
      bridgeRef.current?.write(event.data);
    }).then((unlisten) => {
      unlistenOutput = unlisten;
    });

    void subscribeTerminalStatus(cellId, (event) => {
      syncStatus(event.status, event.error ?? null);
    }).then((unlisten) => {
      unlistenStatus = unlisten;
    });

    void subscribeTerminalCwd(cellId, (event) => {
      onCwdChangeRef.current(event.cwd);
    }).then((unlisten) => {
      unlistenCwd = unlisten;
    });

    return () => {
      isMounted = false;
      unlistenOutput?.();
      unlistenStatus?.();
      unlistenCwd?.();
    };
  }, [cellId, initialStatus]);

  const restart = useCallback(async () => {
    setErrorMessage(null);
    await restartTerminalSession({ cellId });
    setStatus("running");
    onStatusChangeRef.current("running");
  }, [cellId]);

  return {
    hostRef: setHostRef,
    status,
    errorMessage,
    restart,
  };
};
