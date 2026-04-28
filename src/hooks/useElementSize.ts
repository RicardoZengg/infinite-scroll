import { useCallback, useEffect, useState } from "react";

type ElementSize = {
  width: number;
  height: number;
};

const DEFAULT_SIZE: ElementSize = {
  width: 1200,
  height: 760,
};

export const useElementSize = () => {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState<ElementSize>(DEFAULT_SIZE);

  const ref = useCallback((nextNode: HTMLElement | null) => {
    setNode(nextNode);
  }, []);

  useEffect(() => {
    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(320, rect.height),
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => {
        window.removeEventListener("resize", updateSize);
      };
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node]);

  return {
    ref,
    size,
  };
};
