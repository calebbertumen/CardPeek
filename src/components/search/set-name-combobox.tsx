"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import fallbackSetNames from "@/data/pokemon-set-names-fallback.json";

/** Same snapshot as `/api/tcg-sets` fallback so the combobox has options before the first network request (dev compile / slow API). */
const INITIAL_SET_OPTIONS = (fallbackSetNames as string[]).filter(
  (n) => typeof n === "string" && n.trim(),
);

type SetNameComboboxProps = {
  id: string;
  name?: string;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
};

export function SetNameCombobox({
  id,
  name = "setName",
  defaultValue = "",
  className,
  placeholder = "Type or pick a set",
}: SetNameComboboxProps) {
  const [options, setOptions] = useState<string[]>(() => INITIAL_SET_OPTIONS);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [highlighted, setHighlighted] = useState(0);
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = `${id}-set-listbox`;

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    let cancelled = false;
    /** Cancels in-flight fetch when the field unmounts (e.g. route change). */
    const unmountAc = new AbortController();

    function combinedSignal(perAttemptMs: number): AbortSignal {
      const timeoutSig = AbortSignal.timeout(perAttemptMs);
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
        return AbortSignal.any([unmountAc.signal, timeoutSig]);
      }
      return unmountAc.signal;
    }

    const load = async () => {
      const delays = [0, 500, 1200];
      let lastErr: unknown;
      for (let attempt = 0; attempt < delays.length; attempt++) {
        if (cancelled) return;
        if (delays[attempt]! > 0) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
        if (cancelled) return;
        try {
          const r = await fetch("/api/tcg-sets", {
            signal: combinedSignal(55_000),
            cache: "no-store",
          });
          if (!r.ok) throw new Error(String(r.status));
          const d = (await r.json()) as { names?: string[] };
          if (!cancelled) {
            setOptions(Array.isArray(d.names) ? d.names : []);
            setLoadError(false);
          }
          return;
        } catch (e) {
          lastErr = e;
          if (cancelled) return;
          const aborted = e instanceof DOMException && e.name === "AbortError";
          if (aborted && unmountAc.signal.aborted) return;
        }
      }
      if (!cancelled) {
        setLoadError(true);
        if (lastErr) console.error("set list fetch failed", lastErr);
      }
    };

    void load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      unmountAc.abort();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 80);
    return options.filter((n) => n.toLowerCase().includes(q)).slice(0, 100);
  }, [options, value]);

  useEffect(() => {
    setHighlighted(0);
  }, [value, open]);

  /** True when we should show a dropdown panel (not only when filtered has rows — avoids empty panel during API load). */
  const hasDropdownContent =
    loading ||
    filtered.length > 0 ||
    (loadError && options.length === 0) ||
    (value.trim() !== "" && !loading && filtered.length === 0);

  const updateMenuBox = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !open || !hasDropdownContent) {
      setMenuBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const gap = 4;
    const maxDesired = 240;
    const spaceBelow = window.innerHeight - r.bottom - gap - 12;
    setMenuBox({
      top: r.bottom + gap,
      left: r.left,
      width: r.width,
      maxHeight: Math.min(maxDesired, Math.max(64, spaceBelow)),
    });
  }, [open, hasDropdownContent]);

  useLayoutEffect(() => {
    if (!open || !hasDropdownContent) {
      setMenuBox(null);
      return;
    }
    updateMenuBox();
    const onReposition = () => updateMenuBox();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, hasDropdownContent, updateMenuBox, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = useCallback((namePicked: string) => {
    setValue(namePicked);
    setOpen(false);
  }, []);

  /** Close on Tab / focus leave; defer so list mousedown (preventDefault) keeps focus on input. */
  const closeOnBlur = useCallback(() => {
    window.setTimeout(() => {
      const ae = document.activeElement;
      if (wrapRef.current?.contains(ae) || listRef.current?.contains(ae)) return;
      setOpen(false);
    }, 0);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !open &&
      (e.key === "ArrowDown" || e.key === "ArrowUp") &&
      (options.length > 0 || loading || loadError)
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      pick(filtered[highlighted] ?? filtered[0]!);
    }
  };

  const listRows = loading
    ? [{ key: "__loading", label: "Loading sets…", disabled: true }]
    : loadError && options.length === 0
      ? [{ key: "__error", label: "Set list unavailable — type a set name.", disabled: true }]
      : filtered.length > 0
        ? filtered.map((opt) => ({ key: opt, label: opt, disabled: false as const }))
        : value.trim() !== ""
          ? [{ key: "__nomatch", label: "No matching sets", disabled: true }]
          : [];

  const list =
    menuBox && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
            }}
            className="z-[300] touch-pan-y overflow-x-hidden overflow-y-auto overscroll-x-contain rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg shadow-black/50"
          >
            {listRows.map((row, idx) => (
              <li
                key={row.key}
                role="option"
                aria-selected={!row.disabled && idx === highlighted}
                aria-disabled={row.disabled}
                className={cn(
                  "break-words px-3 py-2 text-sm",
                  row.disabled
                    ? "cursor-default text-muted-foreground"
                    : "cursor-pointer",
                  !row.disabled && idx === highlighted ? "bg-accent text-accent-foreground" : !row.disabled && "hover:bg-accent/70",
                )}
                onMouseDown={(e) => row.disabled || e.preventDefault()}
                onMouseEnter={() => !row.disabled && setHighlighted(idx)}
                onClick={() => !row.disabled && pick(row.label)}
              >
                {row.label}
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapRef} className="min-w-0">
      <Input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={closeOnBlur}
        onKeyDown={onKeyDown}
        placeholder={loading ? "Loading sets…" : loadError ? "e.g. Base Set" : placeholder}
        autoComplete="off"
        aria-expanded={open}
        aria-controls={open && hasDropdownContent ? listId : undefined}
        aria-autocomplete="list"
        role="combobox"
        className={cn(className)}
      />
      {list}
    </div>
  );
}
