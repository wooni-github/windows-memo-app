import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { EditorContent, useEditor, type Editor as TipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import { SearchHighlight, SEARCH_PLUGIN_KEY, getSearchState } from './SearchHighlight';

export interface EditorHandle {
  focus: () => void;
  getMarkdown: () => string;
  setMarkdown: (md: string) => void;
  getEditor: () => TipTapEditor | null;
  setSearchQuery: (query: string) => void;
  advanceSearch: (direction: 1 | -1) => void;
  getSearchInfo: () => { count: number; index: number };
}

interface Props {
  initialMarkdown: string;
  onChange: (md: string) => void;
  placeholder?: string;
}

export const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { initialMarkdown, onChange, placeholder = 'Start writing...' },
  ref
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'memo-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      SearchHighlight,
      Placeholder.configure({ placeholder }),
      Markdown.configure({
        // Color marks have no markdown equivalent — keep as HTML spans.
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: true,
        transformPastedText: true,
        transformCopiedText: true
      })
    ],
    content: '',
    autofocus: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror app-no-drag'
      },
      handleDOMEvents: {
        click: (_view, event) => {
          const target = event.target as HTMLElement | null;
          const anchor = target?.closest('a') as HTMLAnchorElement | null;
          if (!anchor) return false;
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const href = anchor.getAttribute('href');
            if (href) window.memo.openExternal(href);
            return true;
          }
          return false;
        }
      }
    },
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown();
      onChange(md);
    }
  });

  // Load initial markdown once editor is ready.
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (current !== initialMarkdown) {
      editor.commands.setContent(initialMarkdown || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editor?.commands.focus(),
      getMarkdown: () => editor?.storage.markdown.getMarkdown() ?? '',
      setMarkdown: (md: string) => editor?.commands.setContent(md, false),
      getEditor: () => editor,
      setSearchQuery: (query: string) => {
        if (!editor) return;
        const tr = editor.state.tr.setMeta(SEARCH_PLUGIN_KEY, { query });
        editor.view.dispatch(tr);
        // After dispatch, scroll the first (current) match into view.
        requestAnimationFrame(() => scrollCurrentMatchIntoView(editor));
      },
      advanceSearch: (direction: 1 | -1) => {
        if (!editor) return;
        const tr = editor.state.tr.setMeta(SEARCH_PLUGIN_KEY, { advance: direction });
        editor.view.dispatch(tr);
        requestAnimationFrame(() => scrollCurrentMatchIntoView(editor));
      },
      getSearchInfo: () => {
        if (!editor) return { count: 0, index: 0 };
        const s = getSearchState(editor.state);
        return {
          count: s?.matches.length ?? 0,
          index: s?.currentIndex ?? 0
        };
      }
    }),
    [editor]
  );

  return <EditorContent editor={editor} />;
});

function scrollCurrentMatchIntoView(editor: TipTapEditor): void {
  const s = getSearchState(editor.state);
  if (!s || s.matches.length === 0) return;
  const match = s.matches[s.currentIndex];
  const dom = editor.view.domAtPos(match.from);
  const node =
    dom.node.nodeType === Node.TEXT_NODE ? dom.node.parentElement : (dom.node as HTMLElement);
  if (!node) return;
  const hit = node.closest('.search-hit-current') ?? node;
  (hit as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
}
