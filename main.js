const { app, BrowserWindow, Tray, Menu, Notification, dialog } = require('electron');
const path = require('path');
const packageJson = require('./package.json');

const ASSETS_PATH = path.join(__dirname, 'assets');
const ICON_PATH = path.join(ASSETS_PATH, 'ekilie_logo.png');
const TRAY_ICON_PATH = path.join(ASSETS_PATH, 'ekilie_logo.png');

let tray = null;
let mainWindow;

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Exit' }
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
        {
          label: 'About',
          click: () => showAboutDialog()
        }
      ]
    }
  ];
  
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAboutDialog() {
  dialog.showMessageBox({
    title: 'About ekiliSense',
    message: 'ekiliSense - Your Wellness Companion',
    detail: `Version ${packageJson.version}\nCopyright © ${new Date().getFullYear()} Ekilie Technologies`,
    icon: ICON_PATH
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    show: false
  });

  mainWindow.on('ready-to-show', () => mainWindow.show());

  try {
    const { default: isOnline } = await import('is-online');
    const online = await isOnline();
    
    await mainWindow.loadURL(online ? 'https://init.ekilie.com' : 'offline.html');
  } catch (error) {
    console.error('Failed to load content:', error);
    await mainWindow.loadFile('offline.html');
  }

  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

function createTray() {
  tray = new Tray(TRAY_ICON_PATH);
  tray.setToolTip('ekiliSense');

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
    {
      label: 'About ekiliSense',
      click: () => showAboutDialog()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
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
  const scheduleNextNotification = () => {
    const now = Date.now();
    const nextMorning = new Date();
    nextMorning.setHours(8, 0, 0, 0);
    if (now > nextMorning) nextMorning.setDate(nextMorning.getDate() + 1);

    const timeout = nextMorning - now;
    setTimeout(() => {
      new Notification({
        title: 'Good Morning!',
        body: 'Start your day with ekiliSense.',
        icon: ICON_PATH
      }).show();
      scheduleNextNotification();
    }, timeout);
  };

  scheduleNextNotification();
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