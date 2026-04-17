import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface SearchState {
  query: string;
  matches: { from: number; to: number }[];
  currentIndex: number;
}

export interface SearchMeta {
  query?: string;
  advance?: 1 | -1 | 0;
}

export const SEARCH_PLUGIN_KEY = new PluginKey<SearchState>('search-highlight');

function findMatches(doc: PMNode, query: string): { from: number; to: number }[] {
  const matches: { from: number; to: number }[] = [];
  if (!query) return matches;
  const needle = query.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const text = (node.text ?? '').toLowerCase();
    let idx = text.indexOf(needle);
    while (idx !== -1) {
      matches.push({ from: pos + idx, to: pos + idx + needle.length });
      idx = text.indexOf(needle, idx + needle.length);
    }
    return false;
  });
  return matches;
}

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: SEARCH_PLUGIN_KEY,
        state: {
          init: (): SearchState => ({ query: '', matches: [], currentIndex: 0 }),
          apply(tr: Transaction, prev: SearchState): SearchState {
            const meta = tr.getMeta(SEARCH_PLUGIN_KEY) as SearchMeta | undefined;
            let next = prev;

            if (meta && typeof meta.query === 'string' && meta.query !== prev.query) {
              const matches = findMatches(tr.doc, meta.query);
              next = { query: meta.query, matches, currentIndex: 0 };
            } else if (tr.docChanged && prev.query) {
              const matches = findMatches(tr.doc, prev.query);
              next = {
                ...prev,
                matches,
                currentIndex: matches.length === 0 ? 0 : Math.min(prev.currentIndex, matches.length - 1)
              };
            }

            if (meta && typeof meta.advance === 'number' && meta.advance !== 0 && next.matches.length > 0) {
              let idx = next.currentIndex + meta.advance;
              if (idx < 0) idx = next.matches.length - 1;
              if (idx >= next.matches.length) idx = 0;
              next = { ...next, currentIndex: idx };
            }

            return next;
          }
        },
        props: {
          decorations(state): DecorationSet | null {
            const s = SEARCH_PLUGIN_KEY.getState(state);
            if (!s || s.matches.length === 0) return null;
            const decos = s.matches.map((m, i) =>
              Decoration.inline(m.from, m.to, {
                class: i === s.currentIndex ? 'search-hit search-hit-current' : 'search-hit'
              })
            );
            return DecorationSet.create(state.doc, decos);
          }
        }
      })
    ];
  }
});

export function getSearchState(state: EditorState): SearchState | null {
  return SEARCH_PLUGIN_KEY.getState(state) ?? null;
}
