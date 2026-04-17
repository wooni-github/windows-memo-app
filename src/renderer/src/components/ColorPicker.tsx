import React, { useEffect, useRef, useState } from 'react';

export interface ColorSwatch {
  label: string;
  value: string; // hex or any CSS color
}

interface Props {
  title: string;
  icon: string;
  activeColor?: string | null;
  palette: ColorSwatch[];
  onPick: (color: string | null) => void;
}

export function ColorPickerButton({
  title,
  icon,
  activeColor,
  palette,
  onPick
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        title={title}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-0.5 rounded-lg p-2 text-slate-700 transition-all hover:bg-white hover:shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        <span
          className="block h-1 w-4 rounded-full"
          style={{ backgroundColor: activeColor ?? '#c0c5c9' }}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 z-40 mt-2 w-52 rounded-2xl border border-surface-container bg-white p-2 shadow-lg ring-1 ring-black/[0.05]"
          role="menu"
        >
          <div className="grid grid-cols-6 gap-1.5 p-1">
            {palette.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => {
                  onPick(c.value);
                  setOpen(false);
                }}
                className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
                  activeColor?.toLowerCase() === c.value.toLowerCase()
                    ? 'ring-2 ring-primary ring-offset-2'
                    : 'border-black/10'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <button
            onClick={() => {
              onPick(null);
              setOpen(false);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[16px]">format_clear</span>
            Remove {title.toLowerCase()}
          </button>
        </div>
      )}
    </div>
  );
}

export const TEXT_COLORS: ColorSwatch[] = [
  { label: 'Default', value: '#2c2f31' },
  { label: 'Primary', value: '#00628c' },
  { label: 'Secondary', value: '#006382' },
  { label: 'Tertiary', value: '#a02d70' },
  { label: 'Error', value: '#b31b25' },
  { label: 'Outline', value: '#747779' },
  { label: 'Ink', value: '#0b0f10' },
  { label: 'Sky', value: '#34b5fa' },
  { label: 'Teal', value: '#17a8ec' },
  { label: 'Pink', value: '#ff8bc5' },
  { label: 'Amber', value: '#c28400' },
  { label: 'Forest', value: '#2f7d32' }
];

export const HIGHLIGHT_COLORS: ColorSwatch[] = [
  { label: 'Yellow', value: '#fff3a3' },
  { label: 'Sky', value: '#cbeaff' },
  { label: 'Mint', value: '#c7f0d8' },
  { label: 'Pink', value: '#ffd2e4' },
  { label: 'Peach', value: '#ffd9b8' },
  { label: 'Lilac', value: '#e2d5ff' },
  { label: 'Lime', value: '#e5f5a6' },
  { label: 'Coral', value: '#ffc8bf' },
  { label: 'Stone', value: '#e5e7ea' },
  { label: 'Slate', value: '#cfd4d8' },
  { label: 'Sun', value: '#ffe08a' },
  { label: 'Ocean', value: '#aadcf5' }
];
