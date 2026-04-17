import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, deriveTitle } from './store';

async function makeTempRoot(): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), 'memo-test-'));
  return dir;
}

describe('Store', () => {
  let root: string;
  beforeEach(async () => {
    root = await makeTempRoot();
  });

  it('creates, saves, loads, and deletes a note', async () => {
    const store = new Store(root);
    await store.load();

    const meta = await store.createNote();
    expect(meta.id).toBeDefined();
    expect(meta.title).toBe('');

    await store.saveNote(meta.id, '# Hello\n\nBody text.', 'Hello');

    const reloaded = new Store(root);
    await reloaded.load();
    const content = await reloaded.loadNote(meta.id);
    expect(content?.markdown).toContain('# Hello');
    expect(content?.meta.title).toBe('Hello');

    const list = await reloaded.listNotes();
    expect(list).toHaveLength(1);
    expect(list[0].preview).toContain('Hello');

    await reloaded.deleteNote(meta.id);
    const afterDelete = await reloaded.listNotes();
    expect(afterDelete).toHaveLength(0);
  });

  it('preserves window state and survives reload', async () => {
    const store = new Store(root);
    await store.load();
    const meta = await store.createNote();
    store.upsertWindowState({
      noteId: meta.id,
      x: 10,
      y: 20,
      width: 500,
      height: 400,
      alwaysOnTop: true,
      isOpen: true
    });
    await store.flushState();

    const next = new Store(root);
    await next.load();
    const s = next.getWindowState(meta.id);
    expect(s?.alwaysOnTop).toBe(true);
    expect(s?.width).toBe(500);
  });
});

describe('deriveTitle', () => {
  it('uses first heading text', () => {
    expect(deriveTitle('# My Note\n\nBody')).toBe('My Note');
    expect(deriveTitle('## Sub\n\nBody')).toBe('Sub');
  });
  it('falls back to first non-empty line', () => {
    expect(deriveTitle('\n\nHello world\n')).toBe('Hello world');
  });
  it('returns empty for empty content', () => {
    expect(deriveTitle('')).toBe('');
    expect(deriveTitle('\n\n\n')).toBe('');
  });
});
