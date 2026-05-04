import { app, BrowserWindow, session, ipcMain, desktopCapturer } from 'electron';
import path from 'path';
// import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocket as WS } from 'ws';

import { resolve4, setServers } from 'dns/promises';

import dns from 'dns';
import { autoUpdater } from 'electron-updater';



// // Fuerza configuración de red
setServers(['8.8.8.8', '1.1.1.1']);
// dns.setDefaultResultOrder('ipv4first');

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);


// autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;




// Load local environment variables from the frontend directory first
dotenv.config();

// Fallback: check if the .env exists in the current directory (dist-electron) or parent
if (!process.env.DEEPGRAM_API_KEY) {
  dotenv.config({ path: path.join(process.cwd(), '.env') });
}

const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL !== undefined;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), // Vite builds CJS to .cjs so Electron processes it cleanly
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log("Cargando modo producción desde: - main.ts:58", indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error("Error al cargar el archivo de producción: - main.ts:60", err);
    });
  }

  mainWindow.webContents.on('did-finish-load', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Handle Desktop Capturer automatically for the Renderer
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      // Find the primary screen or whole screen
      const screenSource = sources.find(s => s.id.startsWith('screen')) || sources[0];
      if (screenSource) {
        // Automatically approve the request
        callback({ video: screenSource, audio: 'loopback' });
      } else {
        console.error("No screen sources found - main.ts:77");
      }
    }).catch(err => {
      console.error("Error securing desktop capture sources: - main.ts:80", err);
    });
  }, { useSystemPicker: false }); // Bypass system picker dialog for seamless loopback
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // autoUpdater.checkForUpdatesAndNotify();
});



// Autoupdate section

import fs from 'fs';

const logFile = path.join(app.getPath('userData'), 'app.log');

const log = (msg: string) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  console.log(msg);
};


autoUpdater.on('checking-for-update', () => {

  console.log('Checking for update... - main.ts:112');
});

autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send("update-available")
  log('Update available');
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates - main.ts:121');
});

autoUpdater.on('error', (err) => {
  console.error('Error: - main.ts:125', err);
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update-progress', progress.percent);
  console.log(`Download speed: ${progress.bytesPerSecond} - main.ts:130`);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-ready');
  autoUpdater.quitAndInstall();
});

// 
ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate()
    .then(() => log('Download started'))
    .catch(err => log('Download error: ' + err.message));
});

// Agrega un handler para cuando el usuario confirme
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});




app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Expose safe IPC mechanisms for API Keys
const ALLOWED_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_DEV_SERVER_URL',
];

ipcMain.handle('get-env', (event, key: string) => {
  if (!ALLOWED_ENV_KEYS.includes(key)) {
    console.warn(`Renderer requested disallowed env var: ${key} - main.ts:166`);
    return undefined;
  }
  return process.env[key];
});

// ----------
// Usa el tipo correcto
let deepgramWs: WS | null = null;


// Función helper para resolver DNS
const resolveDns = (hostname: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses[0]);
    });
  });
};


// 👇 Fuera del ipcMain.handle, en el scope del módulo
let cachedDeepgramIp: string = ''
// Crear conexión WebSocket con Deepgram desde Node.js
ipcMain.handle('deepgram-connect', async (event, { token, language }) => {
  const logpath = path.join(app.getPath("appData"), 'app.log');
  console.log(logpath)
  try {

    try {
      // Intentamos obtener todas las IPs y agarramos la primera
      const addresses = await resolve4('api.deepgram.com');
      cachedDeepgramIp = addresses[0];
    } catch (err) {
      // Fallback: DoH de Google mejorado
      try {
        const dohRes = await fetch('https://dns.google/resolve?name=api.deepgram.com&type=A');
        const dohData = await dohRes.json();

        // Buscamos el primer registro de tipo 1 (A - IPv4 numérica)
        const ipRecord = (dohData.Answer || []).find((record: any) => record.type === 1);

        if (ipRecord && ipRecord.data) {
          cachedDeepgramIp = ipRecord.data;
        } else if (dohData.Answer && dohData.Answer.length > 0) {
          // Si no encontramos tipo 1 pero hay respuestas, intentamos tomar la última (a veces la IP viene al final)
          const lastRecord = dohData.Answer[dohData.Answer.length - 1];
          cachedDeepgramIp = lastRecord.data;
        }
      } catch (dohErr) {
        console.error('Error total en resolución DNS: - main.ts:217', dohErr);
      }
    }

    // Limpieza final: quitar puntos finales o espacios
    if (cachedDeepgramIp) {
      cachedDeepgramIp = cachedDeepgramIp.trim().replace(/\.$/, '');
    }

    // Si después de todo no hay IP o sigue siendo el nombre, usamos una IP de respaldo conocida como último recurso
    if (!cachedDeepgramIp || cachedDeepgramIp.includes('deepgram')) {
      // Opcional: Podríamos dejarlo vacío para que falle, 
      // o usar una IP conocida si el DNS está totalmente roto localmente.
      console.warn('Advertencia: No se pudo obtener una IP numérica válida. Intentando conectar normalmente. - main.ts:230');
    }


    const wsUrl = `wss://api.deepgram.com/v1/listen?language=${language}&model=nova-2&smart_format=true&interim_results=true`;

    const ws = new WS(wsUrl, {
      headers: { Authorization: `Bearer ${token}` },
      handshakeTimeout: 10000, // 10s timeout,
      lookup: (hostname, options, callback) => {
        // Algunas versiones de ws esperan un array de objetos
        callback(null, [{ address: cachedDeepgramIp, family: 4 }] as any);
      }
    });

    deepgramWs = ws;

    ws.on('open', () => {
      event.sender.send('deepgram-status', { type: 'connected' });
    });

    ws.on('message', (data) => {
      event.sender.send('deepgram-message', data.toString());
    });

    ws.on('error', (err) => {
      console.error('Deepgram WS error: - main.ts:256', err.message);
      event.sender.send('deepgram-status', { type: 'error', message: err.message });
    });

    ws.on('close', () => {
      if (deepgramWs === ws) {
        deepgramWs = null;
        event.sender.send('deepgram-status', { type: 'disconnected' });
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Enviar audio chunks al WS desde el renderer
ipcMain.handle('deepgram-send', async (event, audioChunk: Buffer<ArrayBuffer>) => {
  if (deepgramWs?.readyState === WS.OPEN) {

    deepgramWs.send(Buffer.from(audioChunk));
    return { success: true };
  }
  return { success: false, error: 'WebSocket not open' };
});

// Keep-alive para mantener el WS abierto durante pausa
ipcMain.handle('deepgram-keepalive', async () => {
  if (deepgramWs?.readyState === WS.OPEN) {
    deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
    return { success: true };
  }
  return { success: false };
});

// Cerrar el WS
ipcMain.handle('deepgram-disconnect', async () => {
  if (deepgramWs) {
    deepgramWs.close();
    deepgramWs = null;
  }
  return { success: true };
});