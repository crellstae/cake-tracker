const config = require('./util/config');
const fiat = require('./util/fiat');
const Notification = require('./notification');

class Staking {
  fiat = 0;
  page = undefined;
  interval = undefined;

  constructor() {
    this.notification = new Notification('staking');
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

  async getProfit(callback, callbackInterval) {
    console.log(`[${new Date().toLocaleString()}] Obteniendo staking.`);

    // const isLoadingInterval = setInterval(async () => {
    //   const isLoading = await this.pageIsLoading();

    //   console.log(isLoading);

    //   if (!isLoading) clearInterval(isLoadingInterval);
    // }, 2500);

    // Establece solo tokens donde hay staking
    await this.clickOnStakedOnly();

    // Click en el detalle de todos los tokens disponibles
    await this.clickOnTokensEarnedDetail();
    
    // Obtiene los tokens acumulados
    this.interval = setInterval(async () => {
      try {
        const profitData = await this.getTokensEarnedData();

        this.notification.trackStaking(profitData);

        callbackInterval(profitData);
      } catch (err) {
        console.error(`[${new Date().toLocaleString()}] Ocurrió un error al obtener información de staking: ${err.message}`);
      }
    }, 5000);

    callback();
  }

  async clickOnConnectWallet() {
    const selector = 'sc-hKFxyN tSBKF';

    // Dispara evento click para conexión de la wallet
    await this.page.waitForSelector(`button[class*='${selector}']`);
    await this.page.evaluate(x => {
      const buttons = document.getElementsByClassName(x.selector);
      const list = Array.from(buttons);

      if (list !== undefined && list.length > 0) {
        // Filtra por el botón con el texto correcto
        const connectWalletButton = list.filter(x => x.textContent === 'Connect Wallet')[0];

        if (connectWalletButton !== undefined) connectWalletButton.click();
      }
    }, { selector: selector });
  }

  async clickOnWalletConnectService() {
    const selector = '#wallet-connect-walletconnect';

    // Dispara evento click para conexión de la wallet
    await this.page.waitForSelector(selector);
    let handle = await this.page.$(selector);
    await handle.evaluate(x => x.click());
  }

  async clickOnStakedOnly() {
    const selector = '.kjNUQZ';

    // Establece solo tokens donde hay staking
    await this.page.waitForSelector(selector);
    let handle = await this.page.$(selector);
    await handle.evaluate(x => x.click());
  }

  async clickOnTokensEarnedDetail() {
    const selector = 'sc-gggoXN byiTzm';
    const detailSelector = '.iiWEXc';
    const roleSelector = 'row';

    // Obtiene las filas de tokens que tenemos disponibles
    await this.page.waitForSelector(`div[class*='${selector}']`);
    await this.page.evaluate(x => {
      let elements = document.getElementsByClassName(x.selector);
      let list = Array.from(elements);
      let result = [];

      if (list !== undefined && list.length > 0) {
        result.push(...list.filter(o => o.getAttribute('role')  === x.roleSelector));
      }

      if (result.length > 0) {
        for (let element of result) {
          const detail = element.querySelector(x.detailSelector);
          if (detail !== undefined && detail.textContent === 'Details') detail.click();
        }
      }
    }, { selector: selector, detailSelector: detailSelector, roleSelector: roleSelector });
  }

  async takeQRScreenshot() {
    const selector = '#walletconnect-wrapper';

    // Toma captura de la imagen QR
    await this.page.waitForSelector(selector);
    const base64Image = await this.page.screenshot({ encoding: 'base64', clip: { x: 175, y: 105, width: 450, height: 450 }});

    return base64Image;
  }

  async getTokensEarnedData() {
    const selector = 'sc-hmvkKb bFTnFy';
    const logoSelector = 'sc-gXfVKN jKLUHq';
    const tokenInfoSelector = '.sc-kBqmDu.LzWAL';
    const tokenLogoSelector = '.sc-gXfVKN.jKLUHq'
    const tokenNameSelector = '.sc-gtsrHT.gXQgo';
    const tokenEarnedSelector = '.sc-gtsrHT.bHLiLT';
    const tokenEarnedUSDSelector = '.sc-gtsrHT.MYPrH';
    const tokenAprSelector = '.sc-gtsrHT.gMTdjB';
    const cakeStakedSelector = '.sc-gtsrHT.bHLiLT';

    // Obtiene las filas de tokens que tenemos disponibles
    await this.page.waitForSelector(`div[class*='${selector}']`);
    await this.page.waitForSelector(`img[class*='${logoSelector}']`);
    const profitData = await this.page.evaluate(x => {
      let elements = document.getElementsByClassName(x.selector);
      let tokens = Array.from(elements);
      let profitDataList = [];

      if (tokens !== undefined && tokens.length > 0) {
        for (let token of tokens) {
          const tokenInfo = token.querySelectorAll(x.tokenInfoSelector);
          const tokenHeader = token.previousSibling;
          let tokenProfit = { };

          // Si tiene mas de dos divs esta correcto
          if (tokenInfo.length >= 1) {
            // Obtiene los elementos necesarios
            const name = tokenInfo[0].querySelector(x.tokenNameSelector);
            const earned = tokenInfo[0].querySelector(x.tokenEarnedSelector);
            const earnedUsd = tokenInfo[0].querySelector(x.tokenEarnedUSDSelector);
            const cakeStaked = tokenInfo[1].querySelector(x.cakeStakedSelector);

            // Asigna el texto de los elementos
            if (name !== undefined) tokenProfit.tokenName = name.textContent.trim();
            if (earned !== undefined) tokenProfit.tokenProfit = earned.textContent.trim();
            if (earnedUsd !== undefined) tokenProfit.tokenUSDProfit = earnedUsd.textContent.trim();
            if (cakeStaked !== undefined) tokenProfit.cakeStaked = cakeStaked.textContent.trim();
            
            // Realiza pequeños cálculos
            tokenProfit.tokenUSDProfit = tokenProfit.tokenUSDProfit.replace('~', '').replace('USD', '').trim();
            tokenProfit.fiatProfit = tokenProfit.tokenUSDProfit * x.fiat;
          }

          // Se obtiene el logo
          if (tokenHeader !== undefined) {
            const tokenLogo = tokenHeader.querySelector(x.tokenLogoSelector);
            if (tokenLogo !== undefined && tokenLogo !== null) tokenProfit.logo = tokenLogo.src;

            // Se optibe el apr
            const apr = tokenHeader.querySelector(x.tokenAprSelector);
            if (apr !== undefined) tokenProfit.apr = apr.textContent.trim();
          }

          profitDataList.push(tokenProfit);
        }
      }

      return profitDataList;
    }, { 
      selector: selector,
      tokenInfoSelector: tokenInfoSelector,
      tokenLogoSelector: tokenLogoSelector,
      tokenNameSelector: tokenNameSelector,
      tokenEarnedSelector: tokenEarnedSelector,
      tokenEarnedUSDSelector: tokenEarnedUSDSelector,
      tokenAprSelector: tokenAprSelector,
      cakeStakedSelector: cakeStakedSelector,
      fiat: this.fiat
    });

    return profitData;
  }

  async pageIsLoading(isLoading) {
    const selector = 'sc-fyGvY fLibQH';
    let result = false;

    if (isLoading === undefined || isLoading) {
      // Dispara evento click para conexión de la wallet
      await this.page.waitForSelector(`div[class*='${selector}']`);
      result = await this.page.evaluate(x => {
        const loader = document.getElementsByClassName(x.selector);
        console.log(loader);

        if (loader !== undefined || loader !== null) return true;

        return false;
      }, { selector: selector });
    }

    return result;
  }

  async disconnect() {
    clearInterval(this.interval);
  }
}

module.exports = Staking;