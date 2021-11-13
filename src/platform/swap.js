const config = require('./util/config');
const utils = require('./util/utils');
const fiat = require('./util/fiat');

// Tokens disponibles 
const tokens = [
  { key: 'cake', name: 'CAKE', contract: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82' }
];

// Stable tokens disponibles
const stableTokens = [
  { key: 'busd', name: 'BUSD', contract: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' },
  { key: 'usdt', name: 'USDT', contract: '0x55d398326f99059fF775485246999027B3197955' }
];

// Selectores
const inputCurrencySelector = '//*[@id="swap-currency-input"]/div/div[2]/button';
const outputCurrencySelector = '//*[@id="swap-currency-output"]/div/div[2]/button';
const tokenItemSelector = '.token-item-';
const pairSelector = '#pair';
const searchInputSelector = '#token-search-input';
const tokenAmountSelector = '.token-amount-input';
const exchangeTokenAmountSelector = '//*[@id="swap-currency-output"]/div/div[2]/input';
const stablePriceChangeSelector = '.sc-iKUVsf';
const stablePriceSelector = '//*[@id="swap-page"]/div[1]/div[4]/div/div[2]';

class Swap {
  fiat = 0;
  page = undefined;
  interval = undefined;
  stableTokenInvestment = 0;

  constructor(from, to, stableFirst = false) {
    // Inversa si es stable token primero
    if (!stableFirst) {
      this.from = tokens.find(x => x.key === from.trim());
      this.to = stableTokens.find(x => x.key === to.trim());
    } else {
      this.from = stableTokens.find(x => x.key === from.trim());
      this.to = tokens.find(x => x.key === to.trim());
    }

    this.stableFirst = stableFirst;
  }

  async initialize(browser) {
    this.fiat = await fiat.value;
    this.page = await browser.newPage({ context: utils.generateGUID() });
    await this.page.goto(config.pancakeSwapURL);
  }

  async getProfit(callback) {
    console.log('Get profit from: ' + this.from.name);

    if (await this.setCurrency(inputCurrencySelector, this.from.contract, this.from.name)) {
      await this.setCurrency(outputCurrencySelector, this.to.contract, this.to.name).then(async () => {
        await this.page.type(tokenAmountSelector, this.investment).then(async () => {
  
          // Cambia la conversión a monto estable
          if (!this.stableFirst) {
            await this.page.waitForSelector(stablePriceChangeSelector);
            let handlePriceExchange = await this.page.$(stablePriceChangeSelector);
            await handlePriceExchange.evaluate(x => x.click());
          }
  
          // Se pone a leer el sitio cada determinado tiempo
          this.interval = setInterval(async () => {
            try {
              const profitData = await this.getData();

              callback(profitData);
            } catch (err) {
              console.error(err);
              this.disconnect();
            }
          }, 2500);
        });
      });
    }
  }

  async setCurrency(field, token, tokenText) {
    let currencyText = '';
    let canContinue = false;

    // Dispara evento click para seleccionar token
    await this.page.waitForXPath(field);
    let handleCurrencyField = await this.page.$x(field);
    await this.page.evaluate(x => x.click(), handleCurrencyField[0]);
    
    // Realiza busqueda del token
    await this.page.type(searchInputSelector, tokenText).then(() => { canContinue = true; });

    if (canContinue) {
      canContinue = false;

      // Selecciona el token
      await this.page.waitForSelector(tokenItemSelector + token);
      let selectToken = await this.page.$(tokenItemSelector + token);
      await selectToken.evaluate(x => {
        x.click();
      }).then(() => { canContinue = true; });

      if (canContinue) {
        // Obtiene el par para validar si se seleccionó
        await this.page.waitForSelector(pairSelector);
        let handlePair = await this.page.$(pairSelector);
        currencyText = await handlePair.evaluate(x => x.textContent);
      }
    
      if (tokenText === currencyText) return true;
    }
  }

  async setInvestment(investment) {
    this.investment = investment;
  }

  async setStableTokenInvestment(stableTokenInvestment) {
    this.stableTokenInvestment = stableTokenInvestment;
  }

  async getData() {
    // Obtiene el monto del token de salida
    await this.page.waitForXPath(exchangeTokenAmountSelector);
    let handleExchangeTokenAmountSelector = await this.page.$x(exchangeTokenAmountSelector);
    let tokenAmount = await this.page.evaluate(x => x.value, handleExchangeTokenAmountSelector[0]);

    // Obtiene la tarifa 
    await this.page.waitForXPath(stablePriceSelector);
    let handleStablePriceSelector = await this.page.$x(stablePriceSelector);
    let exchangeAmountRate = await this.page.evaluate(x => x.textContent, handleStablePriceSelector[0])

    if (!this.stableFirst) {
      exchangeAmountRate = exchangeAmountRate.toString().replace(`${this.to.name} per ${this.from.name}`, '').trim();
    } else {
      exchangeAmountRate = exchangeAmountRate.toString().replace(`${this.from.name} per ${this.to.name}`, '').trim();
    }

    // Establece los cálculos
    let rate = exchangeAmountRate;
    let fiatRate = rate*this.fiat;
    let stableProfit = (tokenAmount-this.stableTokenInvestment);
    let fiatProfit = (stableProfit*this.fiat);

    return { 'rate': rate, 'fiatRate': fiatRate, 'investment': this.stableTokenInvestment,
      'exchangeAmount': tokenAmount, 'stableProfit': stableProfit, 'fiatProfit': fiatProfit };
  }

  async disconnect() {
    clearInterval(this.interval);
  }
}

module.exports = Swap;