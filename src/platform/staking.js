const config = require('./util/config');
const fiat = require('./util/fiat');

// Selectores
const connectWalletSelector = '//*[@id="root"]/div[1]/nav/div[2]/button';
const walletConnectSelector = '//*[@id="wallet-connect-walletconnect"]';
const walletConnectWrapper = '//*[@id="walletconnect-wrapper"]';
const stakedOnlySelector = '//*[@id="root"]/div[1]/div[2]/div/div[2]/div[1]/div[1]/div[2]/div[1]/input';
const tokenStakedRowSelector = '//*[@id="pools-table"]/div[1]/div[4]';
const stakedCakeSelector = '//*[@id="pools-table"]/div[2]/div[2]/div[2]/div[2]/div[1]/div[1]/span';
const tokenEarnedSelector = '//*[@id="pools-table"]/div[2]/div[2]/div[1]/div[2]/div/div[1]/span';
const tokenStakedNameSelector = '//*[@id="pools-table"]/div[2]/div[2]/div[1]/div[1]/span[1]';
const tokenStakedValueUSDSelector = '//*[@id="pools-table"]/div[2]/div[2]/div[1]/div[2]/div/div[2]/span';

class Staking {
  fiat = 0;
  page = undefined;
  interval = undefined;

  constructor() { }

  async getQR(browser, callback) {
    console.log(`[${new Date().toLocaleString()}] Obteniendo imagen QR de WalletConnect.`);

    this.fiat = await fiat.value;
    this.page = await browser.newPage();
    await this.page.goto(config.pancakeSwapStakingURL);

    // Dispara evento click para conexión de la wallet
    await this.page.waitForXPath(connectWalletSelector);
    let handleConnectWalletSelector = await this.page.$x(connectWalletSelector);
    await this.page.evaluate(x => x.click(), handleConnectWalletSelector[0]);

    // Dispara evento click para conexión de la wallet
    await this.page.waitForXPath(walletConnectSelector);
    let handleWalletConnectSelector = await this.page.$x(walletConnectSelector);
    await this.page.evaluate(x => x.click(), handleWalletConnectSelector[0]);

    // Toma captura de la imagen QR
    await this.page.waitForXPath(walletConnectWrapper);
    const base64Image = await this.page.screenshot({ encoding: 'base64', clip: { x: 175, y: 105, width: 450, height: 450 }});

    callback(base64Image);    
  }

  async getProfit(callback, callbackInterval) {
    console.log(`[${new Date().toLocaleString()}] Obteniendo staking.`);

    // Establece solo tokens donde hay staking
    await this.page.waitForXPath(stakedOnlySelector);
    let handleStakedOnlySelector = await this.page.$x(stakedOnlySelector);
    await this.page.evaluate(x => x.click(), handleStakedOnlySelector[0]);

    // Dispara evento click de staking de token
    await this.page.waitForXPath(tokenStakedRowSelector);
    let handleTokenStakedRowSelector = await this.page.$x(tokenStakedRowSelector);
    await this.page.evaluate(x => x.click(), handleTokenStakedRowSelector[0]);

    // Obtiene el nombe del token en staking
    await this.page.waitForXPath(tokenStakedNameSelector);
    let handleTokenStakedNameSelector = await this.page.$x(tokenStakedNameSelector);
    const tokenName = await this.page.evaluate(x => x.textContent, handleTokenStakedNameSelector[0]);
    
    // Obtiene los tokens acumulados
    this.interval = setInterval(async () => {
      try {
        await this.page.waitForXPath(stakedCakeSelector);
        let handleStakedCakeSelector = await this.page.$x(stakedCakeSelector);
        const cakeStaked = await this.page.evaluate(x => x.textContent, handleStakedCakeSelector[0]);

        await this.page.waitForXPath(tokenEarnedSelector);
        let handleTokenEarnedSelector = await this.page.$x(tokenEarnedSelector);
        const tokenProfit = await this.page.evaluate(x => x.textContent, handleTokenEarnedSelector[0]);

        //tokenStakedValueUSDSelector
        await this.page.waitForXPath(tokenStakedValueUSDSelector);
        let handleTokenStakedValueUSDSelector = await this.page.$x(tokenStakedValueUSDSelector);
        let tokenUSDProfit = await this.page.evaluate(x => x.textContent, handleTokenStakedValueUSDSelector[0]);
        tokenUSDProfit = tokenUSDProfit.replace('~','').replace('USD','').trim()
        
        const profitData = { cakeStaked: cakeStaked, tokenName: tokenName, tokenUSDProfit: tokenUSDProfit, tokenProfit: tokenProfit, fiatRate: this.fiat };

        callbackInterval(profitData);
      } catch (err) {
        console.error(`[${new Date().toLocaleString()}] Ocurrió un error al obtener información de staking: ${err.message}`);
      }
    }, 5000);

    callback();
  }

  async disconnect() {
    clearInterval(this.interval);
  }
}

module.exports = Staking;