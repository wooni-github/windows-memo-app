import { Menu, Tray, nativeImage, app } from 'electron';
import { join } from 'node:path';
import type { WindowManager } from './windowManager';
import type { Store } from './store';

export function createTray(wm: WindowManager, store: Store): Tray {
  const iconPath = resolveIconPath();
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    // Fallback: 1x1 transparent image so Tray doesn't crash when icon missing.
    icon = nativeImage.createEmpty();
  }
  const tray = new Tray(icon);
  tray.setToolTip('Memo');

  const rebuildMenu = (): void => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'New note',
        click: async () => {
          const meta = await store.createNote();
          wm.focusOrOpenNote(meta.id);
          wm.broadcast('notes:changed');
        }
      },
      {
        label: 'Show notes list',
        click: () => wm.openNotesList()
      },
      {
        label: 'Show all notes',
        click: () => wm.showAll()
      },
      {
        label: 'Hide all notes',
        click: () => wm.hideAll()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(menu);
  };

  rebuildMenu();
  tray.on('click', () => wm.openNotesList());
  return tray;
}

function resolveIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'icon.ico');
  }
  return join(app.getAppPath(), 'build/icon.ico');
}
