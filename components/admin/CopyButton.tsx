"use client";

import { useCallback, useState } from "react";

type CopyButtonProps = {
  value: string;
  label: string;
  className?: string;
  disabled?: boolean;
};

export default function CopyButton({
  value,
  label,
  className = "",
  disabled = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!value?.trim() || disabled) return;
    try {
      await navigator.clipboard.writeText(value.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [value, disabled]);

  return (
    <button
      type="button"
      className={`admin-copy-btn${copied ? " is-copied" : ""}${className ? ` ${className}` : ""}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleCopy();
      }}
      disabled={disabled || !value?.trim()}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
