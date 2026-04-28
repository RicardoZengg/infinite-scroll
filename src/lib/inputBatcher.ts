export type InputBatcherOptions = {
  flush: (chunk: string) => Promise<void> | void;
  intervalMs?: number;
  maxBatchSize?: number;
  onError?: (error: unknown) => void;
};

export type InputBatcher = {
  push: (data: string) => void;
  flushNow: () => void;
  dispose: () => void;
};

const DEFAULT_INTERVAL_MS = 12;
const DEFAULT_MAX_BATCH_SIZE = 1024;

export const createInputBatcher = ({
  flush,
  intervalMs = DEFAULT_INTERVAL_MS,
  maxBatchSize = DEFAULT_MAX_BATCH_SIZE,
  onError,
}: InputBatcherOptions): InputBatcher => {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let flushing = false;
  let disposed = false;

  const scheduleFlush = (delay = intervalMs) => {
    if (disposed || timer) {
      return;
    }

    timer = setTimeout(() => {
      timer = null;
      flushChunk();
    }, delay);
  };

  const flushChunk = () => {
    if (disposed || flushing || buffer.length === 0) {
      return;
    }

    const chunk = buffer;
    buffer = "";
    flushing = true;

    Promise.resolve(flush(chunk))
      .catch((error) => {
        onError?.(error);
      })
      .finally(() => {
        flushing = false;
        if (!disposed && buffer.length > 0) {
          scheduleFlush(0);
        }
      });
  };

  return {
    push: (data) => {
      if (disposed || data.length === 0) {
        return;
      }

      buffer += data;
      if (buffer.length >= maxBatchSize) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        flushChunk();
        return;
      }

      scheduleFlush();
    },
    flushNow: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flushChunk();
    },
    dispose: () => {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
};
