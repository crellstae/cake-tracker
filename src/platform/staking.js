const config = require('./util/config');
const fiat = require('./util/fiat');

// Selectores
const connectWalletSelector = '//*[@id="root"]/div[1]/nav/div[2]/button';
const walletConnectSelector = '//*[@id="wallet-connect-walletconnect"]';
const walletConnectWrapper = '//*[@id="walletconnect-wrapper"]';
const stakedOnlySelector = '//*[@id="root"]/div[1]/div[2]/div/div[2]/div[1]/div[1]/div[2]/div[1]/input';
const cakeStakeRowSelector = '//*[@id="pools-table"]/div[1]/div[4]';
const stakedCakeSelector = '//*[@id="pools-table"]/div[2]/div[2]/div[2]/div[2]/div[1]/div[1]/span';
const cakeEarnedSelector = '//*[@id="pools-table"]/div[2]/div[2]/div[1]/div[2]/div/div[1]/span';

class Staking {
  fiat = 0;
  page = undefined;
  interval = undefined;

  constructor() { }

  async getQR(browser, callback) {
    console.log('Get staking...');

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
    // Establece solo tokens donde hay staking
    await this.page.waitForXPath(stakedOnlySelector);
    let handleStakedOnlySelector = await this.page.$x(stakedOnlySelector);
    await this.page.evaluate(x => x.click(), handleStakedOnlySelector[0]);

    // Dispara evento click de staking de cake
    await this.page.waitForXPath(cakeStakeRowSelector);
    let handleCakeStakeRowSelector = await this.page.$x(cakeStakeRowSelector);
    await this.page.evaluate(x => x.click(), handleCakeStakeRowSelector[0]);
    
    // Obtiene los cakes acumulados
    this.interval = setInterval(async () => {
      try {
        await this.page.waitForXPath(stakedCakeSelector);
        let handleStakedCakeSelector = await this.page.$x(stakedCakeSelector);
        const cakeStaked = await this.page.evaluate(x => x.textContent, handleStakedCakeSelector[0]);

        await this.page.waitForXPath(cakeEarnedSelector);
        let handleCakeEarnedSelector = await this.page.$x(cakeEarnedSelector);
        const cakeProfit = await this.page.evaluate(x => x.textContent, handleCakeEarnedSelector[0]);
        
        const profitData = { cakeStaked: cakeStaked, cakeProfit: cakeProfit, fiatRate: this.fiat };

        callbackInterval(profitData);
      } catch {
        this.disconnect();
      }
    }, 2500);

    callback();
  }

  async disconnect() {
    clearInterval(this.interval);
  }
}

module.exports = Staking;