const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: "Notes"
  });

  // Load the compiled Vite SPA
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  
  // Support toggling full screen natively
  win.on('enter-html-full-screen', () => {
    win.setFullScreen(true);
  });
  
  win.on('leave-html-full-screen', () => {
    win.setFullScreen(false);
  });
}

app.whenReady().then(() => {
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
