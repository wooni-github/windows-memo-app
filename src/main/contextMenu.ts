import {
  BrowserWindow,
  Menu,
  MenuItem,
  clipboard,
  shell,
  type MenuItemConstructorOptions
} from 'electron';

function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

export function attachContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_evt, params) => {
    const template: MenuItemConstructorOptions[] = [];

    const {
      editFlags,
      selectionText,
      linkURL,
      misspelledWord,
      dictionarySuggestions,
      isEditable
    } = params;

    // Spelling suggestions (if cursor is on a misspelled word)
    if (isEditable && misspelledWord && dictionarySuggestions.length > 0) {
      for (const suggestion of dictionarySuggestions.slice(0, 5)) {
        template.push({
          label: suggestion,
          click: () => win.webContents.replaceMisspelling(suggestion)
        });
      }
      template.push({
        label: 'Add to dictionary',
        click: () => win.webContents.session.addWordToSpellCheckerDictionary(misspelledWord)
      });
      template.push({ type: 'separator' });
    }

    // Link items
    if (linkURL) {
      template.push({
        label: 'Open link in browser',
        enabled: isSafeExternalUrl(linkURL),
        click: () => {
          if (isSafeExternalUrl(linkURL)) void shell.openExternal(linkURL);
        }
      });
      template.push({
        label: 'Copy link address',
        click: () => clipboard.writeText(linkURL)
      });
      template.push({ type: 'separator' });
    }

    // Standard edit actions
    template.push(
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        enabled: editFlags.canUndo,
        role: 'undo'
      },
      {
        label: 'Redo',
        accelerator: 'CmdOrCtrl+Y',
        enabled: editFlags.canRedo,
        role: 'redo'
      },
      { type: 'separator' },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        enabled: editFlags.canCut,
        role: 'cut'
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        enabled: editFlags.canCopy || selectionText.length > 0,
        role: 'copy'
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        enabled: editFlags.canPaste,
        role: 'paste'
      },
      {
        label: 'Paste as plain text',
        accelerator: 'CmdOrCtrl+Shift+V',
        enabled: editFlags.canPaste,
        role: 'pasteAndMatchStyle'
      },
      { type: 'separator' },
      {
        label: 'Select all',
        accelerator: 'CmdOrCtrl+A',
        enabled: editFlags.canSelectAll,
        role: 'selectAll'
      }
    );

    // Strip leading/trailing separators.
    while (template.length && template[0].type === 'separator') template.shift();
    while (template.length && template[template.length - 1].type === 'separator') template.pop();

    const menu = Menu.buildFromTemplate(template);
    // popup on the window at the click position.
    menu.popup({ window: win, x: params.x, y: params.y });

    // Suppress unused import warning for MenuItem in some TS configs.
    void MenuItem;
  });
}
