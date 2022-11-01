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
require('electron-reload')(__dirname);

//#region Constants
const appIconMini = path.join(__dirname, '/assets/google_32x32.ico');
const appName = require('./package.json').productName;
//#endregion

//#region Electron Store
const store = new (require('electron-store'))({
  defaults: { autostart: true },
});

store.onDidChange('autostart', () =>
  app.setLoginItemSettings({
    openAtLogin: store.get('autostart'),
  })
);
//#endregion

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

function createSearchWindow() {
  // Create the browser window.
  const searchWindow = new BrowserWindow({
    icon: appIconMini,
    width: 800,
    height: 100,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: process.env.ELECTRON_DEV,
    },
    center: true,
    resizable: false,
    useContentSize: true,
    transparent: true,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    frame: false,
    movable: false,
    show: false,
  });

  // and load the index.html of the app.
  searchWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
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

  const toggleSearchWindow = () => {
    if (!searchWindow.isVisible()) return searchWindow.show();
    searchWindow.hide();
  };

  //#region Event Listeners
  searchWindow.on('hide', () => globalShortcut.unregister('Enter'));
  searchWindow.on('show', () => {
    searchWindow.focus();
    searchWindow.webContents.send('#searchInput:focus');
  });
  if (!process.env.ELECTRON_DEV)
    searchWindow.on('blur', () => searchWindow.hide());

  globalShortcut.register('Escape', () => searchWindow.hide());
  globalShortcut.register('Shift+Space', toggleSearchWindow);
  tray.addListener('click', toggleSearchWindow);

  ipcMain.on('#searchForm:submit', (e, query) => {
    shell.openExternal('https://google.com/search?q=' + query);
    searchWindow.hide();
  });
  // #endregion

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createSearchWindow();
  });
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
