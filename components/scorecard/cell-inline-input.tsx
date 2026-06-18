"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface CellInlineInputProps {
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  disabled?: boolean;
  placeholder?: string;
}

function sanitizeScoreInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 3);
}

export function CellInlineInput({
  initialValue = "",
  onSubmit,
  onCancel,
  disabled,
  placeholder = "",
}: CellInlineInputProps) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  const setInputRef = useCallback((node: HTMLInputElement | null) => {
    ref.current = node;
    node?.focus();
    if (initialValue) node?.select();
  }, [initialValue]);

  useLayoutEffect(() => {
    ref.current?.focus();
    if (initialValue) ref.current?.select();
  }, [initialValue]);

  return (
    <input
      ref={setInputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoFocus
      spellCheck={false}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      aria-label="Unesi rezultat"
      className="scorecard-inline-input scorecard-value-filled w-full min-w-0 bg-transparent p-0 text-center text-sm font-bold tabular-nums outline-none"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setValue(sanitizeScoreInput(e.target.value))}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          const trimmed = value.trim();
          if (trimmed === "") onCancel();
          else onSubmit(trimmed);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}
