import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { NoteApp } from './NoteApp';
import { NotesListApp } from './NotesListApp';

const role = window.memo.getRole();

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>{role === 'list' ? <NotesListApp /> : <NoteApp />}</React.StrictMode>
);
