const { app, BrowserWindow } = require('electron')
const puppeteer = require('puppeteer');
const ipc = require('electron').ipcMain;
const path = require('path');
const config = require('./src/platform/util/config');
const Swap = require('./src/platform/swap');
const Staking = require('./src/platform/staking');

let configData = undefined;
let browser = undefined;
let globalStableTokenAmount = 0.0;
let swapCakeToStableService = undefined;
let swapStableToCakeService = undefined;
let stakingService = undefined;

function createWindow () {
  const win = new BrowserWindow({
    width: 1080,
    height: 950,
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

  // Obtiene la configuración
  configData = config.data();
  config.setWin(win);
}

async function getBrowser() {
  browser = await puppeteer.launch({ headless: true, slowMo: 100, devtools: false });
  return browser;
}

app.whenReady().then(() => {
  createWindow();
  
  
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipc.on('create-start-process', async (event, data) => {
  startProccess();
});

ipc.on('create-staking-qr-service', async (event, data) => {
  startStakingProfitService();
});

ipc.on('create-buy-profit-service', async (event, data) => {
  startBuyProfitService();
});

ipc.on('create-sell-profit-service', async (event, data) => {
  startSellProfitService();
});

ipc.on('stop-process', async (event, data) => {
  // Desconectar y cerrar procesos
  if (swapCakeToStableService !== undefined) swapCakeToStableService.disconnect();
  if (swapStableToCakeService !== undefined) swapStableToCakeService.disconnect();
  if (stakingService !== undefined) stakingService.disconnect();
  if (browser !== undefined) browser.disconnect();
  if (browser !== undefined) browser.close();

  swapCakeToStableService = undefined;
  swapStableToCakeService = undefined;
  stakingService = undefined;

  // Remover listeners
  ipc.removeAllListeners('staking-profit-service');
  ipc.removeAllListeners('buy-profit-service');
  ipc.removeAllListeners('sell-profit-service');
  ipc.removeAllListeners('start-process');
});

async function startProccess() {
  // Inicia proceso de escucha
  ipc.on('start-process', async (event, data) => {
    try {
      globalStableTokenAmount = data.stableTokenAmount;

      // Inicializa navegador y servicios de compra/venta
      const browser = await getBrowser();
      await startStakingQRService(browser, event, data);
      await startStableToCakeService(browser, event, data);
      await startCakeToStableService(browser, event, data);
    } catch (err) {
      console.log(err);
    }
  });
}

async function startStakingProfitService() {
  // Inicia proceso de escucha
  ipc.on('staking-profit-service', async(event, data) => {
    if (stakingService === undefined) return;
    
    // Obtiene el profit
    try {
      await stakingService.getProfit(() => {
      }, (profitData) => {
        event.reply('profit-process', { type: 'staking', error: false, tokens: [...profitData] });
      });
    } catch (err) {
      console.error(err);
      event.reply('profit-process', { type: 'staking', error: true });
    }
  });
}

async function startSellProfitService() {
  // Inicia proceso de escucha
  ipc.on('sell-profit-service', async(event, args) => {
    if (swapCakeToStableService === undefined) return;

    if (args.cakeStaked > 0) {
      try {
        await swapCakeToStableService.setInvestment(args.cakeStaked);
        await swapCakeToStableService.getProfit((profitData) => {
          event.reply('profit-process', { type: 'sell', error: false, ...profitData });
        });
      } catch (err) {
        console.error(err);
        event.reply('profit-process', { type: 'sell', error: true });
      }
    }
  });
}

async function startBuyProfitService() {
  // Inicia proceso de escucha
  ipc.on('buy-profit-service', async(event, args) => {
    if (swapStableToCakeService === undefined) return;

    try {
      await swapStableToCakeService.getProfit((profitData) => {
        event.reply('profit-process', { type: 'buy', error: false, ...profitData });
      });
    } catch (err) {
      console.error(err);
      event.reply('profit-process', { type: 'buy', error: true });
    }
  });
}

async function startStableToCakeService(browser, event, data) {
  // Inicializar servicio de compra
  swapStableToCakeService = new Swap(data.stableToken.toLowerCase(), "cake", true);
  await swapStableToCakeService.initialize(browser);
  await swapStableToCakeService.setInvestment(data.stableTokenAmount);
}

async function startCakeToStableService(browser, event, data) {
  // Inicializar servicio de venta
  swapCakeToStableService = new Swap('cake', data.stableToken.toLowerCase(), false);
  await swapCakeToStableService.initialize(browser);
  await swapCakeToStableService.setStableTokenInvestment(data.stableTokenAmount);
}

async function startStakingQRService(browser, event, data) {
  // Inicializar servicio de staking
  stakingService = new Staking();
  await stakingService.initialize(browser);

  try {
    await stakingService.getQR((base64Image) => {
      event.reply('staking-qr-service', { base64Image: base64Image, show: true });
    });

  } catch (err) {
    console.error(err);
    event.reply('profit-process', { type: 'staking', error: true });
  }
}