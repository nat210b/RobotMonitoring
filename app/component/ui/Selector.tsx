"use client";

import { useLayoutEffect, useRef, useState } from "react";

export interface RangeOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface Thumb {
  left: number;
  width: number;
}

export function Selector<TValue extends string>({
  value,
  options,
  onChange,
  ariaLabel = "Select range",
}: {
  value: TValue;
  options: readonly RangeOption<TValue>[];
  onChange: (value: TValue) => void;
  ariaLabel?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(null);
  // The thumb is placed without a transition on the first measurement, then slides on later changes.
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const measure = () => {
      const active = group.querySelector<HTMLElement>("button.active");
      if (!active) return setThumb(null);
      setThumb((previous) =>
        previous && previous.left === active.offsetLeft && previous.width === active.offsetWidth
          ? previous
          : { left: active.offsetLeft, width: active.offsetWidth },
      );
    };

    measure();
    const frame = requestAnimationFrame(() => setReady(true));
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value, options]);

  return (
    <div ref={groupRef} className="range-selector" role="group" aria-label={ariaLabel}>
      {thumb && (
        <span
          className="range-selector-thumb"
          aria-hidden="true"
          data-ready={ready}
          style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
        />
      )}
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "active" : ""}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
