const Web3 = require('like-web3');
const fiat = require('./util/fiat');
const Notification = require('./notification');

const tokens = {
  CAKE: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  USDT: '0x55d398326f99059ff775485246999027b3197955',
};

class SwapRouter {
  rate = 0;
  fiat = 0;
  page = undefined;
  interval = undefined;
  stableTokenInvestment = 0;

  constructor() {
    this.stopLoss = new Notification('stop-loss');
    this.takeProfit = new Notification('take-profit');
    this.alertBuy = new Notification('alert-buy');
    this.alertSell = new Notification('alert-sell');
    this.notification = new Notification('info', 21600);

    this.web3 = new Web3({
      providers: ['https://bsc-dataseed1.binance.org:443'],
      testnet: false,
      privateKey: ''
    });
  }

  async initialize() {
    this.fiat = await fiat.value;

    setInterval(async () => {
      this.fiat = await fiat.value;
      console.log(`[${new Date().toLocaleString()}] Actualización de tarifa FIAT.`);
    }, 21600000)
  }

  async setCakeInvestment(value) {
    this.cakeInvestment = value;
  }

  async setStableInvestment(value) {
    this.stableInvestment = value;
  }

  async setBUSD() {
    console.log(`[${new Date().toLocaleString()}] Seleccionando BUSD.`);
    
    this.stableToken = tokens.BUSD;
    this.stableTokenName = 'BUSD';
  }

  async setUSDT() {
    console.log(`[${new Date().toLocaleString()}] Seleccionando USDT.`);

    this.stableToken = tokens.USDT;
    this.stableTokenName = 'USDT';
  }

  async getProfit(callback) {
    console.log(`[${new Date().toLocaleString()}] Obteniendo datos de Pancakeswap Router.`);

    this.interval = setInterval(async () => {
      try {
        const sellRate = await this.getCakeToStableRate();
        const buyRate = await this.getStableToCakeRate(sellRate);
        const sellSwapAmount = await this.getCakeToStable(this.cakeInvestment);
        const buySwapAmount = await this.getStableToCake(this.stableInvestment);
        const sellProfitData = await this.calculateSellSwap(sellSwapAmount, sellRate);
        const buyProfitData = await this.calculateBuySwap(buySwapAmount, buyRate);

        const result = {
          sell: sellProfitData,
          buy: buyProfitData
        }

        callback(result);

        try {
          // Notificaciones unificadas
          await this.notification.trackInfo();

          // Notificación para stop-loss y take-profit en ventas
          await this.stopLoss.trackProfit(result.sell.fiatRate, result.sell.fiatProfit, this.stableInvestment, result.sell.exchangedAmount);
          await this.takeProfit.trackProfit(result.sell.fiatRate, result.sell.fiatProfit, this.stableInvestment, result.sell.exchangedAmount);

          // Alerta de venta
          await this.alertSell.trackAlert({ stableTokenName: this.stableTokenName, stableRate: result.sell.stableRate, fiatRate: result.sell.fiatRate });

          // Alerta de compra
          await this.alertBuy.trackAlert({ stableTokenName: this.stableTokenName, stableRate: result.sell.stableRate, fiatRate: result.sell.fiatRate });
        } catch (err) {
          console.log(`[${new Date().toLocaleString()}] Swap-Router notificaciones error: ${err}`);
        }
      } catch (err) {
        console.log(`[${new Date().toLocaleString()}] Swap-Router error: ${err}`);
      }
    }, 10000);
  }

  async calculateSellSwap(sellSwapAmount, sellRate) {
    // Establece los cálculos
    let fiatRate = sellRate*this.fiat;
    let stableProfit = (sellSwapAmount-this.stableInvestment);
    let fiatProfit = (stableProfit*this.fiat);
    let fiatExchanged = (sellSwapAmount*this.fiat);

    const data = { 
      stableRate: sellRate,
      fiatRate: fiatRate,
      fiateValue: parseFloat(this.fiat),
      stableProfit: stableProfit,
      fiatProfit: fiatProfit,
      investment: this.cakeInvestment,
      exchangedAmount: sellSwapAmount,
      fiatExchangedAmount: fiatExchanged
    }

    return data;
  }

  async calculateBuySwap(buySwapAmount, buyRate) {
    // Establece los cálculos
    let fiatRate = buyRate*this.fiat;
    let fiatExchanged = ((buySwapAmount*buyRate)*this.fiat);

    const data = { 
      stableRate: buyRate,
      fiatRate: fiatRate,
      fiateValue: parseFloat(this.fiat),
      investment: this.stableInvestment,
      exchangedAmount: buySwapAmount,
      fiatExchangedAmount: fiatExchanged
    }

    return data;
  }

  async getCakeToStable(value) {
    const amounts = await this.web3.contract('PANCAKESWAP_ROUTER').getAmountsOut(this.web3.toWei(value.toString(), 18), [tokens.CAKE, this.stableToken]);
    const amount = this.web3.fromWei(amounts[1], 18);
    
    return amount;
  }

  async getCakeToStableRate() {
    const amounts = await this.web3.contract('PANCAKESWAP_ROUTER').getAmountsOut(this.web3.toWei('1', 18), [tokens.CAKE, this.stableToken]);
    const amount = this.web3.fromWei(amounts[1], 18);
    
    return amount;
  }

  async getStableToCake(value) {
    const amounts = await this.web3.contract('PANCAKESWAP_ROUTER').getAmountsOut(this.web3.toWei(value.toString(), 18), [this.stableToken, tokens.CAKE]);
    const amount = this.web3.fromWei(amounts[1], 18);

    return amount;
  }

  async getStableToCakeRate(baseRate) {
    const amounts = await this.web3.contract('PANCAKESWAP_ROUTER').getAmountsOut(this.web3.toWei('1', 18), [this.stableToken, tokens.CAKE]);
    const amount = this.web3.fromWei(amounts[1], 18);

    let stableValue = parseFloat(baseRate);
    let cakeLimit = amount;

    while (cakeLimit <= 1.0000) {
      stableValue += .01
      cakeLimit = amount * stableValue;
    }

    return stableValue;
  }

  async disconnect() {
    clearInterval(this.interval);
  }
}

module.exports = SwapRouter;