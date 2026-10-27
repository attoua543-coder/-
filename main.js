const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let ffmpegProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 980,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // mainWindow.webContents.openDevTools();
}

function getFfmpegExecutable() {
  const candidates = [
    path.join(__dirname, 'ffmpeg.exe'),
    path.join(__dirname, 'ffmpeg'),
    'ffmpeg'
  ];

  for (const candidate of candidates) {
    if (candidate === 'ffmpeg') {
      return candidate;
    }

    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (error) {
      // ignore
    }
  }

  return 'ffmpeg';
}

function setStreamState(state, details = '') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('stream-state', { state, details });
  }
}

function onFfmpegData(data) {
  const text = String(data || '');
  if (!text.trim()) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ffmpeg-log', text);
  }
}

ipcMain.handle('check-ffmpeg', () => {
  return getFfmpegExecutable();
});

ipcMain.handle('start-stream', async (event, options = {}) => {
  if (ffmpegProcess && !ffmpegProcess.killed) {
    return { ok: false, message: 'البث يعمل بالفعل.' };
  }

  const videoPath = options.videoPath;
  const rtmpUrl = (options.rtmpUrl || '').trim();
  const streamKey = (options.streamKey || '').trim();
  const loopEnabled = Boolean(options.loopEnabled);

  if (!videoPath) {
    return { ok: false, message: 'يرجى اختيار ملف فيديو أولاً.' };
  }

  if (!rtmpUrl || !streamKey) {
    return { ok: false, message: 'يرجى إدخال رابط الخادم ومفتاح البث.' };
  }

  const ffmpegPath = getFfmpegExecutable();
  const finalUrl = `${rtmpUrl.replace(/\/+$/, '')}/${streamKey.replace(/^\/+/, '')}`;

  const args = [
    '-re',
    '-stream_loop',
    loopEnabled ? '-1' : '0',
    '-i', videoPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-f', 'flv',
    finalUrl
  ];

  try {
    ffmpegProcess = spawn(ffmpegPath, args, {
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    setStreamState('connecting', 'جارٍ الاتصال بالخادم...');

    ffmpegProcess.stdout.on('data', (chunk) => onFfmpegData(chunk));
    ffmpegProcess.stderr.on('data', (chunk) => onFfmpegData(chunk));

    ffmpegProcess.on('error', (error) => {
      setStreamState('offline', `خطأ في FFmpeg: ${error.message}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('stream-error', error.message);
      }
      ffmpegProcess = null;
    });

    ffmpegProcess.on('close', (code, signal) => {
      const exitCode = code ?? signal ?? 'unknown';
      if (code === 0) {
        setStreamState('offline', 'تم إيقاف البث بنجاح.');
      } else {
        setStreamState('offline', `تم إنهاء البث برمز الخروج: ${exitCode}`);
      }
      ffmpegProcess = null;
    });

    setTimeout(() => {
      if (ffmpegProcess && !ffmpegProcess.killed) {
        setStreamState('live', 'مباشر الآن 🔴');
      }
    }, 2000);

    return { ok: true, message: 'تم بدء البث بنجاح.' };
  } catch (error) {
    return { ok: false, message: `فشل بدء البث: ${error.message}` };
  }
});

ipcMain.handle('stop-stream', () => {
  if (ffmpegProcess && !ffmpegProcess.killed) {
    ffmpegProcess.kill('SIGTERM');
    setStreamState('offline', 'تم إيقاف البث يدويًا.');
    ffmpegProcess = null;
    return { ok: true };
  }

  return { ok: false, message: 'لا يوجد بث قيد التشغيل.' };
});

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
    if (ffmpegProcess && !ffmpegProcess.killed) {
      ffmpegProcess.kill('SIGTERM');
    }
    app.quit();
  }
});
