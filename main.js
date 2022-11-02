const path = require('path');
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  shell,
} = require('electron');

// Realtime reloads preload and renderer scripts. Good for dev environment.
if (process.env.ELECTRON_DEV) require('electron-reload')(__dirname);

//#region Constants
const appIconMini = path.join(__dirname, '/assets/google_32x32.ico');
const appName = require('./package.json').productName;
const appWidth = 800;
const appHeight = 100;
//#endregion

const store = new (require('electron-store'))({
  defaults: { autostart: true },
});

const toggleAutostart = () =>
  app.setLoginItemSettings({
    openAtLogin: store.get('autostart'),
  });

toggleAutostart();

store.onDidChange('autostart', () => toggleAutostart());

//#region Native Elements
function createTray() {
  const tray = new Tray(appIconMini);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Autostart ',
      type: 'checkbox',
      checked: store.get('autostart'),
      click: () => {
        if (store.get('autostart')) return store.set('autostart', false);
        store.set('autostart', true);
      },
    },
    { type: 'separator' },
    {
      label: 'Exit ' + appName,
      type: 'normal',
      icon: path.join(__dirname, '/assets/logout_24x24.png'),
      click: () => app.quit(),
    },
  ]);
  tray.setToolTip(appName);
  tray.setContextMenu(contextMenu);

  return tray;
}

app.commandLine.appendSwitch('force_high_performance_gpu');

function createSearchWindow() {
  // Create the browser window.
  const searchWindow = new BrowserWindow({
    icon: appIconMini,
    width: appWidth,
    height: appHeight,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    resizable: false,
    fullscreenable: false,
    frame: false,
    movable: false,
    transparent: true,
    skipTaskbar: true,
    x: -appWidth,
    y: -appHeight,
  });

  // and load the index.html of the app.
  searchWindow.loadFile('index.html');

  // Prevent showing taskbar on fullscreen apps.
  searchWindow.setAlwaysOnTop(true, 'screen-saver');

  // Open the DevTools.
  if (process.env.ELECTRON_DEV) searchWindow.webContents.openDevTools();

  return searchWindow;
}
//#endregion

//#region App Cycle
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  const tray = createTray();
  const searchWindow = createSearchWindow();

  globalShortcut.register('Shift+Space', toggleSearchWindow);
  tray.addListener('click', showSearchWindow);
  if (!process.env.ELECTRON_DEV) searchWindow.on('blur', hideSearchWindow);

  ipcMain.on('#searchForm:submit', (e, query) => {
    shell.openExternal('https://google.com/search?q=' + query);
    hideSearchWindow();
  });

  if (!process.env.ELECTRON_DEV)
    ipcMain.on('#searchInput:blur', () => hideSearchWindow());

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createSearchWindow();
  });

  function toggleSearchWindow() {
    if (searchWindow.getPosition()[0] === -appWidth) return showSearchWindow();
    hideSearchWindow();
  }

  function showSearchWindow() {
    searchWindow.center();
    searchWindow.focus();
    searchWindow.webContents.send('#searchInput:focus');
    globalShortcut.register('Escape', hideSearchWindow);
  }

  function hideSearchWindow() {
    searchWindow.setPosition(-appWidth, -appHeight);
    searchWindow.blur();
    globalShortcut.unregister('Escape');
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Prevent autostarting the app if it is manually closed.
/* app.on('before-quit', () => app.setLoginItemSettings({ openAtLogin: false })); */
// #endregion
