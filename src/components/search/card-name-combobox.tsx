"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 5;

type CardNameComboboxProps = {
  id: string;
  name?: string;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
};

export function CardNameCombobox({
  id,
  name = "name",
  defaultValue = "",
  className,
  placeholder = "e.g. Charizard",
  required,
}: CardNameComboboxProps) {
  const [value, setValue] = useState(defaultValue);
  const [debounced, setDebounced] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = `${id}-name-listbox`;
  const fetchSeq = useRef(0);

  useEffect(() => {
    setValue(defaultValue);
    setDebounced(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const seq = ++fetchSeq.current;
    const ac = new AbortController();

    setLoading(true);
    void fetch(`/api/tcg-card-names?q=${encodeURIComponent(q)}`, {
      signal: ac.signal,
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ names: [] })))
      .then((d: { names?: string[] }) => {
        if (seq !== fetchSeq.current) return;
        const names = Array.isArray(d.names) ? d.names.slice(0, MAX_SUGGESTIONS) : [];
        setSuggestions(names);
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return;
        setSuggestions([]);
      })
      .finally(() => {
        if (seq === fetchSeq.current) setLoading(false);
      });

    return () => ac.abort();
  }, [debounced]);

  useEffect(() => {
    setHighlighted(0);
  }, [suggestions, debounced]);

  const showNameMenu = open && debounced.trim().length > 0;

  const updateMenuBox = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !showNameMenu) {
      setMenuBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const gap = 4;
    const maxDesired = 200;
    const spaceBelow = window.innerHeight - r.bottom - gap - 12;
    setMenuBox({
      top: r.bottom + gap,
      left: r.left,
      width: r.width,
      maxHeight: Math.min(maxDesired, Math.max(64, spaceBelow)),
    });
  }, [showNameMenu]);

  useLayoutEffect(() => {
    if (!showNameMenu) {
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
  }, [showNameMenu, updateMenuBox, value, suggestions, loading]);

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
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && debounced.trim().length > 0) {
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
      setHighlighted((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      pick(suggestions[highlighted] ?? suggestions[0]!);
    }
  };

  const listRows =
    loading && debounced.trim().length > 0
      ? [{ key: "__loading", label: "Loading…", disabled: true as const }]
      : suggestions.length > 0
        ? suggestions.map((opt) => ({ key: opt, label: opt, disabled: false as const }))
        : debounced.trim() !== "" && !loading
          ? [{ key: "__none", label: "No matching cards", disabled: true as const }]
          : [];

  const list =
    menuBox && typeof document !== "undefined" && showNameMenu
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
                onMouseDown={(ev) => row.disabled || ev.preventDefault()}
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
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        aria-expanded={open}
        aria-controls={showNameMenu && listRows.length > 0 ? listId : undefined}
        aria-autocomplete="list"
        role="combobox"
        className={cn(className)}
      />
      {list}
    </div>
  );
}
