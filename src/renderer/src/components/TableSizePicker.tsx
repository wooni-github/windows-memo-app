import React, { useEffect, useRef, useState } from 'react';

const MAX_ROWS = 10;
const MAX_COLS = 10;

interface Props {
  onInsert: (rows: number, cols: number) => void;
}

export function TableSizePicker({ onInsert }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [rowsInput, setRowsInput] = useState('3');
  const [colsInput, setColsInput] = useState('3');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const insertFromGrid = (rows: number, cols: number): void => {
    if (rows < 1 || cols < 1) return;
    onInsert(rows, cols);
    setOpen(false);
    setHover({ r: 0, c: 0 });
  };

  const insertFromInputs = (): void => {
    const r = Math.max(1, Math.min(50, parseInt(rowsInput, 10) || 0));
    const c = Math.max(1, Math.min(20, parseInt(colsInput, 10) || 0));
    if (r && c) insertFromGrid(r, c);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        title="Insert table"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-slate-700 transition-all hover:bg-white hover:shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">table</span>
      </button>
      {open && (
        <div
          className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-surface-container bg-white p-3 shadow-lg ring-1 ring-black/[0.05]"
          role="menu"
        >
          <div className="mb-2 text-center text-xs font-medium text-on-surface-variant tabular-nums">
            {hover.r > 0 && hover.c > 0 ? `${hover.r} × ${hover.c}` : 'Pick a size'}
          </div>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1rem)` }}
            onMouseLeave={() => setHover({ r: 0, c: 0 })}
          >
            {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
              const r = Math.floor(i / MAX_COLS) + 1;
              const c = (i % MAX_COLS) + 1;
              const on = r <= hover.r && c <= hover.c;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHover({ r, c })}
                  onClick={() => insertFromGrid(r, c)}
                  className={`h-4 w-4 rounded-sm border ${
                    on
                      ? 'border-primary bg-primary-container/60'
                      : 'border-outline-variant/50 bg-surface-container-low'
                  } transition-colors`}
                />
              );
            })}
          </div>
          <div className="mt-3 border-t border-surface-container/60 pt-3">
            <div className="mb-1 text-xs font-medium text-on-surface-variant">Custom size</div>
            <div className="flex items-center gap-2 text-sm">
              <NumField value={rowsInput} onChange={setRowsInput} label="Rows" max={50} />
              <span className="text-outline">×</span>
              <NumField value={colsInput} onChange={setColsInput} label="Cols" max={20} />
              <button
                onClick={insertFromInputs}
                className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary-dim"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NumField({
  value,
  onChange,
  label,
  max
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  max: number;
}): JSX.Element {
  return (
    <label className="flex flex-col">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-12 rounded-lg border border-outline-variant/50 bg-surface-container-low px-2 py-1 text-center text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
