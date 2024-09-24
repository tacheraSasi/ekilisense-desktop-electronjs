const { app, BrowserWindow, Tray, Menu, Notification } = require('electron');
const path = require('path');

let tray = null;
let mainWindow;

// Function to create the main window
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 992,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false, // Disabling sandboxing
    },
    icon: path.join(__dirname, 'assets/ekilie_logo.png'),  
    frame: true , // Using system window frame for native window controls
    menu:null,
  });

  // Dynamically importing `is-online` module
  const isOnline = (await import('is-online')).default;

  // Checking internet connectivity and load appropriate page
  const online = await isOnline();
  if (online) {
    mainWindow.loadURL('https://init.ekilie.com');  
  } else {
    mainWindow.loadFile('offline.html');  
  }
}

// Schedule notification
function scheduleMorningNotification() {
  const now = new Date();
  const morningTime = new Date();
  morningTime.setHours(8, 0, 0, 0);  // Schedule for 8:00 AM

  // Calculate time until 8 AM tomorrow if it's already past 8 AM today
  if (now > morningTime) {
    morningTime.setDate(morningTime.getDate() + 1);
  }

  const timeUntilMorning = morningTime - now;
  // console(timeUntilMorning)

  // Schedule notification after the calculated time
  setTimeout(() => {
    new Notification({
      title: 'Good Morning!',
      body: 'Start your day with ekiliSense.'
    }).show();

    // Schedule again for tomorrow
    scheduleMorningNotification();
  }, timeUntilMorning);
}

// Create tray icon for system tray integration
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/ekilie_logo.jpeg'));  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => { mainWindow.show(); } },
    { label: 'Quit', click: () => { app.quit(); } }
  ]);
  tray.setToolTip('ekiliSense');
  tray.setContextMenu(contextMenu);
}

// App initialization
app.whenReady().then(() => {
  createWindow();
  createTray();
  scheduleMorningNotification();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
