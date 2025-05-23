const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  dialog,
  ipcMain,
} = require("electron");
const path = require("path");
const packageJson = require("../package.json");
const BugReporter = require("./bugReporter");
require("dotenv").config();

const bugReporter = new BugReporter(process.env.RELAY_API_KEY);

const ASSETS_PATH = path.join(__dirname, "../assets");
const ICON_PATH = path.join(ASSETS_PATH, "ekilie_logo.png");
const TRAY_ICON_PATH = path.join(ASSETS_PATH, "ekilie_logo.png");

let tray = null;
let mainWindow;

app.setName("ekiliSense");
app.setAppUserModelId("com.ekilie.sense");
app.setPath("userData", path.join(app.getPath("userData"), "ekiliSense"));
app.setPath("temp", path.join(app.getPath("temp"), "ekiliSense"));
app.setPath("logs", path.join(app.getPath("logs"), "ekiliSense"));
app.setPath("cache", path.join(app.getPath("cache"), "ekiliSense"));

function createApplicationMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Home",
          accelerator: "CmdOrCtrl+S",
          click: () => mainWindow.loadURL("https://init.ekilie.com"),
        },
        {
          label: "Game",
          accelerator: "CmdOrCtrl+G",
          click: () => mainWindow.loadFile("game.html"),
        },
        { type: "separator" },
        { role: "quit", label: "Exit", accelerator: "CmdOrCtrl+Q" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        {
          role: "toggleDevTools",
          visible: process.env.NODE_ENV === "development",
        },
      ],
    },
    {
      label: "Quick Links",
      submenu: [
        {
          label: "Admin Console",
          click: () =>
            mainWindow.loadURL("https://sense.ekilie.com/console?from=desktop"),
        },
        {
          label: "Teacher Console",
          click: () =>
            mainWindow.loadURL(
              "https://auth.ekilie.com/sense/teacher?from=desktop",
            ),
        },
        { type: "separator" },
        { label: "About ekiliSense", click: () => showAboutDialog() },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => mainWindow.loadURL("https://sense.ekilie.com#about"),
        },
        {
          label: "Report Bug",
          click: () => bugReporter.sendBugReport(mainWindow),
        },
        { type: "separator" },
        { label: "About ekiliSense", click: () => showAboutDialog() },
      ],
    },
    {
      label: "About",
      submenu: [
        {
          label: "Terms and policies",
          click: () =>
            mainWindow.loadURL("https://sense.ekilie.com/terms-and-policies"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAboutDialog() {
  dialog.showMessageBox({
    title: "About ekiliSense",
    message: "AI-Powered School Management Software",
    detail:
      `Version ${packageJson.version}\n` +
      `© ${new Date().getFullYear()} ekilie Technologies\n` +
      "Dar es Salaam, Tanzania\n" +
      "Phone: +255 686 477 074\n" +
      "Email: support@ekilie.com",
    icon: ICON_PATH,
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 800,
    minHeight: 400,
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    show: false,
    title: "ekiliSense",
  });

  mainWindow.on("ready-to-show", () => {
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
  const { default: isOnline } = await import("is-online");
  const online = await isOnline();
  await mainWindow.loadURL(online ? "https://init.ekilie.com" : "offline.html");
}

function handleLoadError(error) {
  console.error("Failed to load content:", error);
  dialog.showErrorBox(
    "Connection Error",
    "Failed to connect to ekiliSense services",
  );
  mainWindow.loadFile("offline.html");
}

function setupWindowListeners() {
  mainWindow.on("close", (event) => {
    if (process.platform === "darwin") {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("focus", () => updateTrayContextMenu());
}

function setupIPC() {
  ipcMain.handle("get-app-info", () => ({
    version: packageJson.version,
    platform: process.platform,
  }));

  ipcMain.on("show-notification", (_, { title, body }) => {
    new Notification({ title, body, icon: ICON_PATH }).show();
  });
}

function createTray() {
  try {
    tray = new Tray(TRAY_ICON_PATH).resize(16, 16);
    tray.setPressedImage(TRAY_ICON_PATH);
    tray.setContextMenu(Menu.buildFromTemplate([]));
    tray.setToolTip("ekiliSense");
  } catch (error) {
    console.error("Tray icon error:", error);
    try {
      // Fallback to main icon
      tray = new Tray(ICON_PATH).resize(16, 16);
    } catch (fallbackError) {
      console.error("Fallback tray icon failed:", fallbackError);
      return;
    }
  }

  if (!tray) return;

  tray.setToolTip("ekiliSense");
  tray.on("double-click", () => toggleWindowVisibility());
  updateTrayContextMenu();
}

function updateTrayContextMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? "Hide App" : "Show App",
      click: () => toggleWindowVisibility(),
    },
    { type: "separator" },
    {
      label: "Attendance Overview",
      click: () => mainWindow?.webContents?.send("show-attendance"),
      enabled: !!mainWindow,
    },
    {
      label: "Recent Grades",
      click: () => mainWindow?.webContents?.send("show-grades"),
      enabled: !!mainWindow,
    },
    { type: "separator" },
    { label: "About ekiliSense", click: () => showAboutDialog() },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}

function toggleWindowVisibility() {
  if (!mainWindow) return;

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
    nextReportTime.setHours(16, 0, 0, 0);

    if (now > nextReportTime) {
      nextReportTime.setDate(nextReportTime.getDate() + 1);
    }

    const timeout = nextReportTime - now;

    setTimeout(() => {
      new Notification({
        title: "Daily School Report Ready",
        body: "Attendance and grade summaries are available",
        icon: ICON_PATH,
      }).show();
      scheduleDailyReport();
    }, timeout);
  };

  scheduleDailyReport();
}

async function checkConnection() {
  const { default: isOnline } = await import("is-online");
  const online = await isOnline();
  mainWindow.webContents.send("connection-status", online);
}

app.enableSandbox();
app.setName("ekiliSense");

app.whenReady().then(async () => {
  createApplicationMenu();
  await createMainWindow();
  createTray();
  scheduleNotifications();

  app.on("activate", () => {
    if (!mainWindow) createMainWindow();
    else if (!mainWindow.isVisible()) mainWindow.show();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
