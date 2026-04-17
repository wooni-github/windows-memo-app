import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { NoteSummary } from '@shared/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function NotesListApp(): JSX.Element {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [query, setQuery] = useState<string>('');
  const [loaded, setLoaded] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    const next = await window.memo.listNotes();
    setNotes(next);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
    const off = window.memo.onNotesChanged(() => void refresh());
    return off;
  }, [refresh]);

  // Shortcuts for list window.
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        void window.memo.createNote();
      } else if (mod && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        window.memo.closeWindow();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.meta.title.toLowerCase().includes(q) || n.preview.toLowerCase().includes(q)
    );
  }, [notes, query]);

  const onNewNote = useCallback(async () => {
    await window.memo.createNote();
  }, []);

  const onDelete = useCallback(async (id: string, title: string) => {
    const ok = window.confirm(
      `Delete "${title || 'Untitled'}"? This cannot be undone.`
    );
    if (!ok) return;
    await window.memo.deleteNote(id);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-surface-bright">
      <div className="app-window relative m-2 flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/40 bg-white ring-1 ring-black/[0.05]">
        <div className="app-drag flex items-center justify-between px-6 pt-5 pb-3 md:px-10 md:pt-6">
          <h1 className="font-headline text-2xl font-extrabold text-primary md:text-3xl">
            Notes
          </h1>
          <div className="app-no-drag flex items-center gap-2">
            <button
              onClick={onNewNote}
              className="flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dim hover:shadow active:scale-95"
              title="New note (Ctrl+N)"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New
            </button>
            <div className="mx-1 h-6 w-px bg-outline-variant/30" />
            <button
              onClick={() => window.memo.minimizeWindow()}
              className="rounded-full p-2 text-slate-500 hover:bg-surface-container-low"
              title="Minimize"
            >
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
            <button
              onClick={() => window.memo.closeWindow()}
              className="rounded-full p-2 text-slate-500 hover:bg-error/10 hover:text-error"
              title="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="app-no-drag border-b border-surface-container/40 px-6 pb-3 md:px-10">
          <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2">
            <span className="material-symbols-outlined text-[18px] text-outline">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-outline"
            />
          </div>
        </div>

        <div className="app-no-drag flex-1 overflow-auto px-6 py-5 md:px-10">
          {!loaded ? (
            <div className="text-sm text-on-surface-variant">Loading...</div>
          ) : filtered.length === 0 ? (
            <EmptyState hasNotes={notes.length > 0} onNewNote={onNewNote} />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((n) => (
                <li key={n.meta.id}>
                  <NoteCard summary={n} onOpen={() => window.memo.openNote(n.meta.id)} onDelete={() => onDelete(n.meta.id, n.meta.title)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteCard({
  summary,
  onOpen,
  onDelete
}: {
  summary: NoteSummary;
  onOpen: () => void;
  onDelete: () => void;
}): JSX.Element {
  const title = summary.meta.title.trim() || 'Untitled';
  return (
    <div
      onDoubleClick={onOpen}
      className="group flex h-44 cursor-pointer flex-col gap-2 rounded-2xl border border-surface-container bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 flex-1 font-headline text-base font-bold text-on-surface">
          {title}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-full p-1 text-outline opacity-0 transition-opacity hover:bg-error/10 hover:text-error group-hover:opacity-100"
          title="Delete"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
      <p className="flex-1 overflow-hidden text-sm leading-snug text-on-surface-variant">
        {summary.preview || <span className="italic text-outline">Empty note</span>}
      </p>
      <div className="flex items-center justify-between text-xs text-outline">
        <span>{formatDate(summary.meta.updatedAt)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="rounded-full px-2 py-1 text-primary hover:bg-surface-container-low"
          title="Open"
        >
          Open
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  hasNotes,
  onNewNote
}: {
  hasNotes: boolean;
  onNewNote: () => void;
}): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center text-on-surface-variant">
      <span className="material-symbols-outlined text-[48px] text-outline">sticky_note_2</span>
      <p className="text-sm">{hasNotes ? 'No notes match your search.' : 'No notes yet.'}</p>
      {!hasNotes && (
        <button
          onClick={onNewNote}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white hover:bg-primary-dim"
        >
          Create your first note
        </button>
      )}
    </div>
  );
}
