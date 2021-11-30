const { app, BrowserWindow } = require('electron')
const puppeteer = require('puppeteer');
const ipc = require('electron').ipcMain;
const path = require('path');
const config = require('./src/platform/util/config');
const SwapRouter = require('./src/platform/swap-router');
const Staking = require('./src/platform/staking');

const profitProcessRenderer = 'profit-process-renderer';
const stakingQRServiceRenderer = 'staking-qr-service-renderer';
const stakingProfitServiceMain = 'staking-profit-service-main';
const swapRouterServiceMain = 'swap-router-service-main';
const startProcessMain = 'start-process-main';

let configData = undefined;
let browser = undefined;
let swapRouterService = undefined;
let stakingService = undefined;

function createWindow () {
  const win = new BrowserWindow({
    width: 1080,
    height: 950,
    resizable: false,
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
  browser = await puppeteer.launch({ headless: false, slowMo: 100, devtools: true });
  return browser;
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipc.on('create-start-process-main', async (event, data) => {
  startProccess();
});

ipc.on('create-staking-qr-service-main', async (event, data) => {
  startStakingProfitService();
});

ipc.on('create-swap-router-service-main', async (event, data) => {
  startSwapRouterService();
});

ipc.on('stop-process-main', async (event, data) => {
  // Desconectar y cerrar procesos
  if (swapRouterService !== undefined) swapRouterService.disconnect();
  if (stakingService !== undefined) stakingService.disconnect();
  if (browser !== undefined) browser.disconnect();
  if (browser !== undefined) browser.close();

  swapRouterService = undefined;
  stakingService = undefined;

  // Remover listeners
  ipc.removeAllListeners(stakingProfitServiceMain);
  ipc.removeAllListeners(swapRouterServiceMain);
  ipc.removeAllListeners(startProcessMain);
});

async function startProccess() {
  // Inicia proceso de escucha
  ipc.on(startProcessMain, async (event, data) => {
    try {
      // Inicializa navegador y servicios de compra/venta
      const browser = await getBrowser();
      await initializeSwapRouterService(event, data)
      await initializeStakingQRService(browser, event, data);
    } catch (err) {
      console.log(`[${new Date().toLocaleString()}] ${err}`);
    }
  });
}

async function startSwapRouterService() {
  // Inicia proceso de escucha
  ipc.on(swapRouterServiceMain, async(event, data) => {
    if (swapRouterService === undefined) return;
    
    await swapRouterService.setCakeInvestment(data.cakeStaked);

    try {
      await swapRouterService.getProfit((result) => {
        event.reply(profitProcessRenderer, { error: false, ...result });
      });
    } catch (err) {
      console.log(`[${new Date().toLocaleString()}] ${err}`);
      event.reply(profitProcessRenderer, { error: true });
    }
  });
}

async function startStakingProfitService() {
  // Inicia proceso de escucha
  ipc.on(stakingProfitServiceMain, async(event, data) => {
    if (stakingService === undefined) return;
    
    // Obtiene el profit
    try {
      await stakingService.getProfit((result) => {
        event.reply(profitProcessRenderer, { type: 'staking', error: false, tokens: [...result] });
      });
    } catch (err) {
      console.log(`[${new Date().toLocaleString()}] ${err}`);
      event.reply(profitProcessRenderer, { type: 'staking', error: true });
    }
  });
}

async function initializeSwapRouterService(event, data) {
  // Inicializar servicio de swap
  swapRouterService = new SwapRouter();
  await swapRouterService.setStableInvestment(data.stableInvestment);
  await swapRouterService.initialize();

  if (data.stableToken == 'BUSD') await swapRouterService.setBUSD();
  if (data.stableToken == 'USDT') await swapRouterService.setUSDT();

  if (data.stakingDisable) {
    event.reply(profitProcessRenderer, { type: 'staking-disabled', error: false });
  }
}

async function initializeStakingQRService(browser, event, data) {
  if (data.stakingDisable) return;
  
  // Inicializar servicio de staking
  stakingService = new Staking();
  await stakingService.initialize(browser);

  try {
    await stakingService.getQR((base64Image) => {
      event.reply(stakingQRServiceRenderer, { base64Image: base64Image, show: true });
    });

  } catch (err) {
    console.log(`[${new Date().toLocaleString()}] ${err}`);
    event.reply(profitProcessRenderer, { type: 'staking', error: true });
  }
}