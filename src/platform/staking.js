const config = require('./util/config');
const fiat = require('./util/fiat');

// Selectores
const connectWalletSelector = '//*[@id="root"]/div[1]/nav/div[2]/button';
const walletConnectSelector = '//*[@id="wallet-connect-walletconnect"]';
const walletConnectWrapper = '//*[@id="walletconnect-wrapper"]';
const stakedOnlySelector = '//*[@id="root"]/div[1]/div[2]/div/div[2]/div[1]/div[1]/div[2]/div[1]/input';
const stakingCakeSelector = '//*[@id="pools-table"]/div[2]/div[2]/div/div[2]/div/div[1]/span';

class Staking {
  fiat = 0;
  page = undefined;
  interval = undefined;

  constructor() { }

  async getQR(browser, callback) {
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
    await this.page.screenshot({ path: './content/qr.png', clip: { x: 175, y: 105, width: 450, height: 450 }});

    // Establece solo tokens donde hay staking
    // await this.page.waitForXPath(stakedOnlySelector);
    // let handleStakedOnlySelector = await this.page.$x(stakedOnlySelector);
    // await this.page.evaluate(x => x.click(), handleStakedOnlySelector[0]);

    callback();
  }

  async getProfit(callback, callbackInterval) {
    // Obtiene los cakes acumulados
    this.interval = setInterval(async () => {
      try {
        await this.page.waitForXPath(stakingCakeSelector);
        let handleStakingCakeSelector = await this.page.$x(stakingCakeSelector);
        const cakeProfit = await this.page.evaluate(x => x.textContent, handleStakingCakeSelector[0]);
        const profitData = { cakeProfit: cakeProfit, fiatRate: this.fiat};

        callbackInterval(profitData);
      } catch {
        this.disconnect();
      }
    }, 5000);

    callback();
  }

  async disconnect() {
    clearInterval(this.interval);
  }
}

module.exports = Staking;