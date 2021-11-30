const config = require('./util/config');
const fiat = require('./util/fiat');
const Notification = require('./notification');

class Staking {
  fiat = 0;
  page = undefined;
  interval = undefined;

  constructor() {
    this.data = config.data();
  }

  async initialize(browser) {
    console.log(`[${new Date().toLocaleString()}] Inicializando componente de Staking.`);

    this.fiat = await fiat.value;
    this.page = await browser.newPage();

    await this.page.goto(config.pancakeSwapStakingURL);
  }

  async getQR(callback) {
    console.log(`[${new Date().toLocaleString()}] Obteniendo imagen QR de WalletConnect.`);

    // Dispara evento click para conexión de la wallet
    await this.clickOnConnectWallet();

    // Dispara evento click para conexión de la wallet
    await this.clickOnWalletConnectService();

    // Toma captura de la imagen QR
    const screenshot = await this.takeQRScreenshot();

    callback(screenshot);    
  }

  async getProfit(callback, callbackOnWalletConnectPassed) {
    console.log(`[${new Date().toLocaleString()}] Obteniendo staking.`);
    
    const loadingSelector = this.data.puppeteer.selectors.staking.loadingClass;
    const walletConnectWrapperId = this.data.puppeteer.selectors.staking.walletConnectWrapperId.replace('#', '');

    // No empezar a leer hasta que se oculte WalletConnect
    await this.page.waitForFunction(`document.getElementById('${walletConnectWrapperId}') === null`, { timeout: 60000 });

    callbackOnWalletConnectPassed();

    // Establece solo tokens donde hay staking
    await this.clickOnStakedOnly();

    // Espera hasta que cargue los tokens
    await this.page.waitForFunction(`Array.from(document.getElementsByClassName('${loadingSelector}')).length === 0`, { timeout: 60000 });
    
    // Obtiene los tokens acumulados
    this.interval = setInterval(async () => {
      try {
        const profitData = await this.getTokensEarnedData();

        callback(profitData);
      } catch (err) {
        console.error(`[${new Date().toLocaleString()}] Ocurrió un error al obtener información de staking: ${err.message}`);
      }
    }, 5000);
  }

  async clickOnConnectWallet() {
    const selector = this.data.puppeteer.selectors.staking.navTag;

    // Dispara evento click para conexión de la wallet
    await this.page.waitForFunction(`document.getElementsByTagName('${selector}').length > 0`);
    await this.page.evaluate(x => {
      const nav = Array.from(document.getElementsByTagName(x.selector))[0];

      if (nav !== undefined) {
        const buttons = Array.from(nav.querySelectorAll('button'));

        if (buttons !== undefined && buttons.length > 0) {
          // Filtra por el botón con el texto correcto
          const connectWalletButton = buttons.find(q => q.textContent === 'Connect Wallet');

          if (connectWalletButton !== undefined) connectWalletButton.click();
        }
      }
    }, { selector: selector });
  }

  async clickOnWalletConnectService() {
    const selector = this.data.puppeteer.selectors.staking.walletConnectId;

    // Dispara evento click para conexión de la wallet
    await this.page.waitForSelector(selector);
    let handle = await this.page.$(selector);
    await handle.evaluate(x => x.click());
  }

  async clickOnStakedOnly() {
    // Establece solo tokens donde hay staking
    await this.page.waitForFunction(`document.getElementsByTagName('input').length > 0`);
    await this.page.evaluate(x => {
      const inputs = Array.from(document.getElementsByTagName('input'));

      if (inputs !== undefined && inputs.length > 0) {
        const stakedOnly = inputs.find(q => q.type === 'checkbox');

        if (stakedOnly !== undefined) stakedOnly.click();
      }
    });
  }

  async takeQRScreenshot() {
    const selector = this.data.puppeteer.selectors.staking.walletConnectWrapperId;

    // Toma captura de la imagen QR
    await this.page.waitForSelector(selector);
    const base64Image = await this.page.screenshot({ encoding: 'base64', clip: { x: 175, y: 105, width: 450, height: 450 }});

    return base64Image;
  }

  async getTokensEarnedData() {
    const selector = this.data.puppeteer.selectors.staking.poolsTableId;

    // Obtiene las filas de tokens que tenemos disponibles
    await this.page.waitForSelector(`#${selector}`);
    const profitData = await this.page.evaluate(x => {
      const table = document.getElementById(x.selector);
      const tokens = Array.from(table.querySelectorAll('div[role=row]'));
      let profitDataList = [];
      
      if (tokens !== undefined && tokens.length > 0) {
        for (const token of tokens) {
          const tokenProfit = { };
          const cells = token.querySelectorAll('div[role=cell]');
          let autoCake = false;

          if (cells === undefined || cells.length <= 0) continue;

          // Se obtiene logo
          if (cells[0] !== undefined) {
            const images = cells[0].querySelectorAll('img');

            if (images !== undefined && images.length > 0) tokenProfit.logo = images[0].src;
          }

          // Se obtiene nombre
          if (cells[0] !== undefined) {
            const name = cells[0].querySelector('div[color=text]');

            // Detectar si es Auto Cake Staking
            if (name.textContent === 'Auto CAKE') {
              autoCake = true;
            }

            if (autoCake) {
              tokenProfit.tokenName = name.textContent.trim();
            } else {
              if (name !== undefined) tokenProfit.tokenName = name.textContent.replace('Earn', '').trim();
            }
          }

          // Se obtiene lo ganado
          if (cells[1] !== undefined) {
            const earned = cells[1].querySelector('div[color=primary]');
            const usd = cells[1].querySelectorAll('div[color=textSubtle]')[1];

            if (earned !== undefined) tokenProfit.tokenProfit = earned.textContent.trim();
            if (usd !== undefined) tokenProfit.tokenUSDProfit = usd.textContent.replace('~', '').replace('USD', '').trim();
          }

          // Se obtiene el apr
          if (cells[2] !== undefined) {
            const apr = cells[2].querySelector('div[color=text]');

            if (apr !== undefined) tokenProfit.apr = apr.textContent.trim();
          }

          // Cálculo de USD * Fiat
          tokenProfit.fiatProfit = tokenProfit.tokenUSDProfit * x.fiat;

          profitDataList.push(tokenProfit);
        }
      }

      return profitDataList;
    }, { 
      selector: selector,
      fiat: this.fiat
    });

    return profitData;
  }

  async disconnect() {
    clearInterval(this.interval);
  }
}

module.exports = Staking;