const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

const createWindow = () => {
  const window = new BrowserWindow({
    width: isDev ? 1280 : 1024,
    height: isDev ? 820 : 720,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      contextIsolation: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  window.loadURL(startUrl);

  if (isDev) {
    window.webContents.openDevTools({ mode: 'detach' });
  }
};

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
