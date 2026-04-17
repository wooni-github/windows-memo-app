import React, { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onQueryChange: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  matchCount: number;
  currentIndex: number;
}

export function FindBar({
  open,
  onClose,
  onQueryChange,
  onNext,
  onPrev,
  matchCount,
  currentIndex
}: Props): JSX.Element | null {
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="app-no-drag absolute right-4 bottom-4 z-30 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-lg ring-1 ring-black/5">
      <span className="material-symbols-outlined text-[18px] text-outline">search</span>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onQueryChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder="Find"
        className="w-44 bg-transparent text-sm outline-none placeholder:text-outline"
      />
      <span className="text-xs text-outline tabular-nums">
        {matchCount > 0 ? `${currentIndex + 1} / ${matchCount}` : q ? '0' : ''}
      </span>
      <button
        className="rounded-full p-1 text-outline hover:bg-surface-container-low"
        title="Previous"
        onClick={onPrev}
      >
        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span>
      </button>
      <button
        className="rounded-full p-1 text-outline hover:bg-surface-container-low"
        title="Next"
        onClick={onNext}
      >
        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
      </button>
      <button
        className="rounded-full p-1 text-outline hover:bg-surface-container-low"
        title="Close"
        onClick={onClose}
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
