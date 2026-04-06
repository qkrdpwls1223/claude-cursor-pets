const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const SessionWatcher = require('./session-watcher');

let overlayWindows = [];
let sessionWatcher = null;
let tray = null;

// ── 설정 파일 ──
const configPath = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

function sendSvgToAll() {
  const cfg = loadConfig();
  const svgPath = cfg.svgPath || path.join(__dirname, 'claudecode-color.svg');
  try {
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    for (const win of overlayWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send('update-svg', svgContent);
      }
    }
  } catch { /* ignore */ }
}

function sendSizeToAll() {
  const cfg = loadConfig();
  const size = cfg.petSize || 64;
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send('update-size', size);
    }
  }
}

function createOverlay() {
  const displays = screen.getAllDisplays();

  // 모니터마다 오버레이 윈도우 생성
  for (const display of displays) {
    const { x, y, width, height } = display.bounds;

    const win = new BrowserWindow({
      x, y, width, height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      hasShadow: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    win.setIgnoreMouseEvents(true, { forward: true });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.loadFile('overlay.html');

    // 각 윈도우에 자기 모니터 바운드 전달
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('window-offset', { x, y, width, height });
      sendSvgToAll();
      sendSizeToAll();
    });

    overlayWindows.push(win);
  }

  // DevTools (첫 번째 윈도우만)
  // overlayWindows[0].webContents.openDevTools({ mode: 'detach' });

  // 세션 감시
  sessionWatcher = new SessionWatcher();
  sessionWatcher.on('change', (count) => {
    for (const win of overlayWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send('session-count', count);
      }
    }
  });
  sessionWatcher.start();

  setInterval(() => {
    const point = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(point);

    for (let i = 0; i < overlayWindows.length; i++) {
      const win = overlayWindows[i];
      if (win.isDestroyed()) continue;

      const db = displays[i].bounds;
      const isActive = (db.x === currentDisplay.bounds.x && db.y === currentDisplay.bounds.y);

      // 항상 해당 모니터 기준 로컬 좌표 전송
      win.webContents.send('mouse-move', {
        x: point.x - db.x,
        y: point.y - db.y,
        active: isActive,
      });
    }
  }, 16);
}

app.disableHardwareAcceleration();

function createTray() {
  const iconPath = path.join(__dirname, 'cat-svgrepo-com.ico');
  tray = new Tray(iconPath);

  let visible = true;

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Claude Pets${sessionWatcher ? ` (${sessionWatcher.lastCount} sessions)` : ''}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: visible ? 'Hide Pets' : 'Show Pets',
        click: () => {
          visible = !visible;
          for (const win of overlayWindows) {
            if (!win.isDestroyed()) {
              visible ? win.show() : win.hide();
            }
          }
          updateMenu();
        },
      },
      {
        label: 'Size',
        submenu: [
          { label: 'S (32px)', value: 32 },
          { label: 'M (48px)', value: 48 },
          { label: 'L (64px)', value: 64 },
          { label: 'XL (96px)', value: 96 },
        ].map(item => ({
          label: item.label,
          type: 'radio',
          checked: (loadConfig().petSize || 64) === item.value,
          click: () => {
            const cfg = loadConfig();
            cfg.petSize = item.value;
            saveConfig(cfg);
            sendSizeToAll();
          },
        })),
      },
      {
        label: 'Change Character...',
        click: async () => {
          const result = await dialog.showOpenDialog({
            title: 'Select SVG Character',
            filters: [{ name: 'SVG', extensions: ['svg'] }],
            properties: ['openFile'],
          });
          if (!result.canceled && result.filePaths[0]) {
            const cfg = loadConfig();
            cfg.svgPath = result.filePaths[0];
            saveConfig(cfg);
            sendSvgToAll();
          }
        },
      },
      {
        label: 'Restart',
        click: () => {
          app.relaunch();
          app.quit();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          if (sessionWatcher) sessionWatcher.stop();
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Claude Pets');
  };

  updateMenu();

  // 세션 수 바뀔 때 메뉴 갱신
  if (sessionWatcher) {
    sessionWatcher.on('change', updateMenu);
  }
}

app.whenReady().then(() => {
  createOverlay();
  createTray();
});

app.on('window-all-closed', (e) => {
  // 트레이 모드에서는 종료하지 않음
  e?.preventDefault?.();
});

ipcMain.on('set-ignore-mouse', (_event, ignore) => {
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, { forward: true });
    }
  }
});
