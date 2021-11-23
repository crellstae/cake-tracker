const { ethers } = require('ethers');
const fiat = require('./util/fiat');
const Notification = require('./notification');

const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

const contract = {
  factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73', // PancakeSwap V2 factory
  router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2 router
};
const tokens = {
  CAKE: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
};

const router = new ethers.Contract(
  contract.router,
  ['function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'],
  provider
);

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
  }

  async initialize() {
    this.fiat = await fiat.value;

    setInterval(async () => {
      this.fiat = await fiat.value;
      console.log(`[${new Date().toLocaleString()}] Actualización de tarifa FIAT.`);
    }, 86400000)
  }

  async setCakeInvestment(value) {
    this.cakeInvestment = value;
  }

  async setStableInvestment(value) {
    this.stableInvestment = value;
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

        // Notificación para stop-loss y take-profit en ventas
        await this.stopLoss.trackProfit(result.sell.fiatRate, result.sell.fiatProfit, this.stableInvestment, result.sell.exchangedAmount);
        await this.takeProfit.trackProfit(result.sell.fiatRate, result.sell.fiatProfit, this.stableInvestment, result.sell.exchangedAmount);

        // Alerta de venta
        await this.alertSell.trackAlert({ stableRate: result.sell.stableRate, fiatRate: result.sell.fiatRate });

         // Alerta de compra
         await this.alertBuy.trackAlert({ stableRate: result.sell.stableRate, fiatRate: result.sell.fiatRate });
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
      fiatExchangeAmount: fiatExchanged
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
      fiatExchangeAmount: fiatExchanged
    }

    return data;
  }

  async getCakeToStable(value) {
    const amounts = await router.getAmountsOut(ethers.utils.parseUnits(value.toString(), 18), [tokens.CAKE, tokens.BUSD]);
    const amount = amounts[1].toString()/1e18;
    
    return amount;
  }

  async getCakeToStableRate() {
    const amounts = await router.getAmountsOut(ethers.utils.parseUnits('1', 18), [tokens.CAKE, tokens.BUSD]);
    const amount = amounts[1].toString()/1e18;
    
    return amount;
  }

  async getStableToCake(value) {
    const amounts = await router.getAmountsOut(ethers.utils.parseUnits(value.toString(), 18), [tokens.BUSD, tokens.CAKE]);
    const amount = amounts[1].toString()/1e18;

    return amount;
  }

  async getStableToCakeRate(baseRate) {
    const amounts = await router.getAmountsOut(ethers.utils.parseUnits('1', 18), [tokens.BUSD, tokens.CAKE]);
    const amount = amounts[1].toString()/1e18;
    let stableValue = baseRate;
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