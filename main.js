// main.js
const { app, BrowserWindow, Tray, Menu, Notification, dialog, ipcMain } = require('electron');
const path = require('path');
const packageJson = require('./package.json');

const ASSETS_PATH = path.join(__dirname, 'assets');
const ICON_PATH = path.join(ASSETS_PATH, 'ekilie_logo.png');
const TRAY_ICON_PATH = path.join(ASSETS_PATH, 'ekilie_tray.png');

let tray = null;
let mainWindow;

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Sync Data', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('sync-data') },
        { type: 'separator' },
        { role: 'quit', label: 'Exit', accelerator: 'CmdOrCtrl+Q' }
      ]
    },
    {
      label: 'School',
      submenu: [
        { label: 'New Student', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('new-student') },
        { label: 'Attendance', click: () => mainWindow.webContents.send('show-attendance') },
        { label: 'Gradebook', click: () => mainWindow.webContents.send('show-gradebook') },
        { type: 'separator' },
        { label: 'Generate Reports', click: () => mainWindow.webContents.send('generate-reports') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools', visible: process.env.NODE_ENV === 'development' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => mainWindow.loadURL('https://docs.ekilisense.com') },
        { type: 'separator' },
        { label: 'About ekiliSense', click: () => showAboutDialog() }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAboutDialog() {
  dialog.showMessageBox({
    title: 'About ekiliSense',
    message: 'AI-Powered School Management Platform',
    detail: `Version ${packageJson.version}\n` +
            `© ${new Date().getFullYear()} Ekilie Technologies\n` +
            'Dar es Salaam, Tanzania\n' +
            'Phone: +255 686 477 074\n' +
            'Email: support@ekilie.com',
    icon: ICON_PATH
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    },
    show: false,
    title: 'ekiliSense School Manager'
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    checkConnection();
  });

  setupWindowListeners();
  setupIPC();

  try {
    await loadMainContent();
  } catch (error) {
    handleLoadError(error);
  }

  return mainWindow;
}

async function loadMainContent() {
  const { default: isOnline } = await import('is-online');
  const online = await isOnline();
  await mainWindow.loadURL(online ? 'https://app.ekilisense.com' : 'offline.html');
}

function handleLoadError(error) {
  console.error('Failed to load content:', error);
  dialog.showErrorBox('Connection Error', 'Failed to connect to ekiliSense services');
  mainWindow.loadFile('offline.html');
}

function setupWindowListeners() {
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('focus', () => updateTrayContextMenu());
}

function setupIPC() {
  ipcMain.handle('get-app-info', () => ({
    version: packageJson.version,
    platform: process.platform
  }));

  ipcMain.on('show-notification', (_, { title, body }) => {
    new Notification({ title, body, icon: ICON_PATH }).show();
  });
}

function createTray() {
  tray = new Tray(TRAY_ICON_PATH);
  tray.setToolTip('ekiliSense School Manager');
  tray.on('double-click', () => toggleWindowVisibility());
  updateTrayContextMenu();
}

function updateTrayContextMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? 'Hide App' : 'Show App',
      click: () => toggleWindowVisibility()
    },
    { type: 'separator' },
    { label: 'Attendance Overview', click: () => mainWindow.webContents.send('show-attendance') },
    { label: 'Recent Grades', click: () => mainWindow.webContents.send('show-grades') },
    { type: 'separator' },
    { label: 'About ekiliSense', click: () => showAboutDialog() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setContextMenu(contextMenu);
}

function toggleWindowVisibility() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
  updateTrayContextMenu();
}

function scheduleNotifications() {
  const scheduleDailyReport = () => {
    const now = Date.now();
    const nextReportTime = new Date();
    nextReportTime.setHours(16, 0, 0, 0); // 4:00 PM local time
    
    if (now > nextReportTime) {
      nextReportTime.setDate(nextReportTime.getDate() + 1);
    }

    const timeout = nextReportTime - now;
    
    setTimeout(() => {
      new Notification({
        title: 'Daily School Report Ready',
        body: 'Attendance and grade summaries are available',
        icon: ICON_PATH
      }).show();
      scheduleDailyReport();
    }, timeout);
  };

  scheduleDailyReport();
}

async function checkConnection() {
  const { default: isOnline } = await import('is-online');
  const online = await isOnline();
  mainWindow.webContents.send('connection-status', online);
}

app.enableSandbox();
app.setName('ekiliSense');

app.whenReady().then(async () => {
  createApplicationMenu();
  await createMainWindow();
  createTray();
  scheduleNotifications();

  app.on('activate', () => {
    if (!mainWindow) createMainWindow();
    else if (!mainWindow.isVisible()) mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});