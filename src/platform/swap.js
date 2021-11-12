const config = require('./util/config');
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
const handleExchangePriceSelector = '.sc-iKUVsf';
const exchangePriceSelector = '//*[@id="swap-page"]/div[1]/div[4]/div/div[2]';

class Swap {
  fiat = 0;
  page = undefined;
  interval = undefined;

  constructor(from, to, investment, stableFirst = false) {
    // Inversa si es stable token primero
    if (!stableFirst) {
      this.from = tokens.find(x => x.key === from.trim());
      this.to = stableTokens.find(x => x.key === to.trim());
    } else {
      this.from = stableTokens.find(x => x.key === from.trim());
      this.to = tokens.find(x => x.key === to.trim());
    }

    this.stableFirst = stableFirst;
    this.investment = investment;
  }

  async initialize(browser, callback) {
    this.initializeWithStableToken(browser, 0, callback);
  }

  async initializeWithStableToken(browser, stableTokenInvestment, callback) {
    this.fiat = await fiat.value;
    this.page = await browser.newPage();
    await this.page.goto(config.pancakeSwapURL);

    if (await this.setCurrency(inputCurrencySelector, this.from.contract, this.from.name)) {
      await this.setCurrency(outputCurrencySelector, this.to.contract, this.to.name).then(async () => {
        await this.page.type(tokenAmountSelector, this.investment).then(async () => {
          console.log('=> Getting amount and price from exchange.');
  
          // Cambia la conversión a monto estable
          if (!this.stableFirst) {
            await this.page.waitForSelector(handleExchangePriceSelector);
            let handlePriceExchange = await this.page.$(handleExchangePriceSelector);
            await handlePriceExchange.evaluate(x => x.click());
          }
          
          console.log('=> All is ready, listening now...');
  
          // Se pone a leer el sitio cada determinado tiempo
          this.interval = setInterval(async () => {
            try {
              const profitData = await this.getProfit(exchangeTokenAmountSelector, exchangePriceSelector, stableTokenInvestment);

              callback(profitData);
            } catch {
              this.disconnect();
            }
          }, 5000);
        });
      });
    }
  }

  async disconnect() {
    clearInterval(this.interval);
  }

  async setCurrency(field, token, tokenText) {
    let currencyText = '';
    let canContinue = false;
    console.log(`=> Getting info for ${tokenText} token.`);

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

  async getProfit(exchangeTokenAmountField, exchangePriceField, stableTokenInvestment) {
    // Obtiene el monto del token de salida
    await this.page.waitForXPath(exchangeTokenAmountField);
    let handleExchangeTokenAmountField = await this.page.$x(exchangeTokenAmountField);
    let tokenAmount = await this.page.evaluate(x => x.value, handleExchangeTokenAmountField[0]);

    // Obtiene la tarifa 
    await this.page.waitForXPath(exchangePriceField);
    let handleExchangePriceField = await this.page.$x(exchangePriceField);
    let exchangeAmountRate = await this.page.evaluate(x => x.textContent, handleExchangePriceField[0])

    if (!this.stableFirst) {
      exchangeAmountRate = exchangeAmountRate.toString().replace(`${this.to.name} per ${this.from.name}`, '').trim();
    } else {
      exchangeAmountRate = exchangeAmountRate.toString().replace(`${this.from.name} per ${this.to.name}`, '').trim();
    }

    // Establece los cálculos
    let rate = exchangeAmountRate;
    let fiatRate = rate*this.fiat;
    let stableProfit = (tokenAmount-stableTokenInvestment);
    let fiatProfit = (stableProfit*this.fiat);

    return { 'rate': rate, 'fiatRate': fiatRate, 'investment': stableTokenInvestment,
      'exchangeAmount': tokenAmount, 'stableProfit': stableProfit, 'fiatProfit': fiatProfit };
  }
}

module.exports = Swap;