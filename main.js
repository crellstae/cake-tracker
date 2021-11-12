const { app, BrowserWindow } = require('electron')
const puppeteer = require('puppeteer');
const ipc = require('electron').ipcMain;
const path = require('path');
const Swap = require('./src/platform/swap');
const Staking = require('./src/platform/staking');

let browser = undefined;
let swapCakeToStable = undefined;
let swapStableToCake = undefined;
let stakingService = undefined;

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 835,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, '/src/app.js')
    }
  });

  win.loadFile('index.html');
  win.setIcon(path.join(__dirname + '/content/icon.png'));
  win.setMenu(null);
  win.webContents.openDevTools();
}

async function GetBrowser() {
  browser = await puppeteer.launch({ headless: true, slowMo: 100 });
  return browser;
}

app.whenReady().then(() => {
  createWindow();
});

ipc.on('create-start-process', async (event, data) => {
  startProccess();
});

ipc.on('stop-process', async (event, data) => {
  // Desconectar y cerrar procesos
  if (swapCakeToStable !== undefined) swapCakeToStable.disconnect();
  if (swapStableToCake !== undefined) swapStableToCake.disconnect();
  if (stakingService !== undefined) stakingService.disconnect();
  if (browser !== undefined) browser.disconnect();
  if (browser !== undefined) browser.close();

  swapCakeToStable = undefined;
  swapStableToCake = undefined;
  stakingService = undefined;

  // Remover listeners
  ipc.removeAllListeners('start-process');
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

async function startProccess() {
  // Inicia proceso de escucha
  ipc.on('start-process', async (event, data) => {
    try {
      // Inicializa navegador y servicios de compra/venta
      const browser = await GetBrowser();
      await startStableToCake(browser, event, data);
      await startCakeToStable(browser, event, data);
      await startStakingService(browser, event, data);
    } catch (err) {
      console.log(err);
    }
  });
}

async function startStableToCake(browser, event, data) {
  // Inicializar servicio de compra
  swapStableToCake = new Swap(data.stableToken.toLowerCase(), "cake", data.stableTokenAmount, true);

  try {
    await swapStableToCake.initialize(browser, (profitData) => {
      event.reply('start-process', { type: 'buy', error: false, ...profitData });
    });
  } catch (err) {
    event.reply('start-process', { type: 'buy', error: true });
  }
}

async function startCakeToStable(browser, event, data) {
  // Inicializar servicio de venta
  swapCakeToStable = new Swap('cake', data.stableToken.toLowerCase(), data.cakeAmount, false);

  try {
    await swapCakeToStable.initializeWithStableToken(browser, data.stableTokenAmount, (profitData) => {
      event.reply('start-process', { type: 'sell', error: false, ...profitData });
    });
  } catch (err) {
    event.reply('start-process', { type: 'sell', error: true });
  }
}

async function startStakingService(browser, event, data) {
  // Inicializar servicio de staking
  stakingService = new Staking();

  try {
    await stakingService.getQR(browser, () => {
      event.reply('staking-qr-process', { show: true });
    });

    ipc.on('staking-qr-process', async(event, data) => {
      await stakingService.getProfit(() => {
      }, (profitData) => {
        event.reply('start-process', { type: 'staking', error: false, ...profitData });
      });

    });
  } catch (err) {
    event.reply('start-process', { type: 'staking', error: true });
  }
}