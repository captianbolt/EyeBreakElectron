// Eye Break desktop (Electron) — tray app with break popup + beeps
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Tiny built-in tray icon (so you don't need to upload an image)
const TRAY_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAM1BMVEUAAABRrKtRrKtRrKtRrKtRrKtRrKtRrKtRrKtRrKtRrKtRrKtRrKtRrKtRrKtRrKu1g+2bAAAAEHRSTlMAEGAw3y9wz8+gkIYvLF3yTsYfAAABCUlEQVQY02WPSw6DMBADL0n7r0h0//+c2a9p2G1wZr5k0mXgkXhN2xv8cO0mN8iXm0a0JqL2x6y1I4n5xYtY2a0w4h1wPgcw2zK0TR1F2eQkHqCk9Qk1c+u3K2g7q8k7q6wiw1x2oZ9oG7gF5h5P0CzYwK4m5YcNf3v9v0b9Yz6m0z9n5Gg9w0m9pD4KpW1q7Kc9mK6W8oEoEoUqgQmC3Dqxsqk9p6o9d8C1KQ1qkWbWvz5t3o7r2bqK9+4wRk9wE7S1m2g8dB8QZb0k8QAAAABJRU5ErkJggg==';

const appIconIco = path.join(__dirname, 'assets', 'icon.ico'); // optional; used if present

const DEFAULTS = {
  workMin: 20,
  breakSec: 20,
  volume: 0.9,
  breakBeeps: 10,
  beepGapMs: 160,
  beepDurMs: 320,
  beepFreq: 1500,
  waveform: 'square',
  loopBreakBeep: true
};

const state = { mode: 'idle', targetEnd: 0, timer: null, tray: null, breakWin: null, settingsWin: null };
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) }; }
  catch { return { ...DEFAULTS }; }
}
function saveSettings(s) { try { fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2), 'utf-8'); } catch {} }
const fmt = (sec) => `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;

function notify(title, body) {
  try { new Notification({ title, body, silent: false }).show(); } catch {}
}

function clearTimer() { if (state.timer) { clearTimeout(state.timer); state.timer = null; } }
function schedule(ms) { clearTimer(); state.targetEnd = Date.now() + ms; state.timer = setTimeout(flipPhase, ms); updateTray(); }

function start() {
  const s = loadSettings();
  state.mode = 'work';
  schedule(s.workMin * 60_000);
  notify('Focus started', `Next break in ${s.workMin} min`);
}
function pause() {
  clearTimer(); state.mode = 'idle'; state.targetEnd = 0;
  if (state.breakWin && !state.breakWin.isDestroyed()) state.breakWin.close();
  updateTray();
}
function flipPhase() {
  const s = loadSettings();
  if (state.mode === 'work') {
    state.mode = 'break';
    notify('Break time', 'Look ~6 m (20 ft) away & blink slowly.');
    openBreak(s.breakSec);
    schedule(s.breakSec * 1000);
  } else {
    if (state.breakWin && !state.breakWin.isDestroyed()) state.breakWin.close();
    state.mode = 'work';
    notify('Back to focus', `Next break in ${s.workMin} min`);
    schedule(s.workMin * 60_000);
  }
}

function openBreak(secs) {
  if (state.breakWin && !state.breakWin.isDestroyed()) state.breakWin.close();
  state.breakWin = new BrowserWindow({
    width: 360, height: 220, frame: false, alwaysOnTop: true, resizable: false, skipTaskbar: true,
    icon: fs.existsSync(appIconIco) ? appIconIco : undefined,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  state.breakWin.setMenuBarVisibility(false);
  state.breakWin.loadFile(path.join(__dirname, 'break', 'break.html'), { query: { secs: String(secs) } });
}
function openSettings() {
  if (state.settingsWin && !state.settingsWin.isDestroyed()) { state.settingsWin.focus(); return; }
  state.settingsWin = new BrowserWindow({
    width: 520, height: 560, resizable: false,
    icon: fs.existsSync(appIconIco) ? appIconIco : undefined,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  state.settingsWin.setMenuBarVisibility(false);
  state.settingsWin.loadFile(path.join(__dirname, 'settings', 'settings.html'));
  state.settingsWin.on('closed', () => state.settingsWin = null);
}
function updateTray() {
  if (!state.tray) return;
  const left = Math.max(0, Math.ceil((state.targetEnd - Date.now())/1000));
  state.tray.setToolTip(`Eye Break: ${state.mode.toUpperCase()} • ${left?fmt(left):'--:--'}`);
}
function createTray() {
  const icon = nativeImage.createFromDataURL(TRAY_DATA_URL);
  state.tray = new Tray(icon);
  state.tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Start', click: start },
    { label: 'Pause / Stop', click: pause },
    { type: 'separator' },
    { label: 'Settings…', click: openSettings },
    { type: 'separator' },
    { label: 'Quit', click: () => { pause(); app.quit(); } }
  ]));
  state.tray.on('click', openSettings);
  updateTray();
}

app.whenReady().then(() => { createTray(); openSettings(); setInterval(updateTray, 1000); });
app.on('window-all-closed', (e) => e.preventDefault());

// IPC (preload bridge)
ipcMain.handle('settings:load', async () => loadSettings());
ipcMain.handle('settings:save', async (_e, p) => { const m = { ...loadSettings(), ...p }; saveSettings(m); return m; });
ipcMain.handle('timer:start', async () => { start(); return true; });
ipcMain.handle('timer:pause', async () => { pause(); return true; });
ipcMain.handle('timer:status', async () => {
  const left = Math.max(0, Math.ceil((state.targetEnd - Date.now())/1000));
  return { mode: state.mode, remain: left };
});
ipcMain.on('break:done', () => { if (state.mode === 'break') flipPhase(); });
