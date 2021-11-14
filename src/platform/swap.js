const config = require('./util/config');
const utils = require('./util/utils');
const fiat = require('./util/fiat');
const Notification = require('./notification');
const { currency } = require('./util/formatter');

// Tokens disponibles 
const tokens = [
  { key: 'cake', name: 'CAKE', contract: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82' }
];

// Stable tokens disponibles
const stableTokens = [
  { key: 'busd', name: 'BUSD', contract: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' },
  { key: 'usdt', name: 'USDT', contract: '0x55d398326f99059fF775485246999027B3197955' }
];

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
    this.stopLoss = new Notification('stop-loss');
    this.takeProfit = new Notification('take-profit');
  }

  async initialize(browser) {
    this.fiat = await fiat.value;
    this.page = await browser.newPage({ context: utils.generateGUID() });
    await this.page.goto(config.pancakeSwapURL);
  }

  async setInvestment(investment) {
    this.investment = investment;
  }

  async setStableTokenInvestment(stableTokenInvestment) {
    this.stableTokenInvestment = stableTokenInvestment;
  }

  async getProfit(callback) {
    console.log(`[${new Date().toLocaleString()}] ${this.from.name}->${this.to.name} - Obteniendo datos del swap.`);
    const inputCurrencySelector = 'swap-currency-input';
    const outputCurrencySelector = 'swap-currency-output';

    if (await this.setCurrency(inputCurrencySelector, this.from.contract, this.from.name)) {
      await this.setCurrency(outputCurrencySelector, this.to.contract, this.to.name).then(async () => {
        await this.typeInvestment().then(async () => {
  
          // Cambia la conversión a monto estable
          if (!this.stableFirst) {
            this.changeToStablePrice();
          }
  
          // Se pone a leer el sitio cada determinado tiempo
          this.interval = setInterval(async () => {
            try {
              const profitData = await this.getData();

              callback(profitData);

              // Solo notifica cuando es servicio de venta
              if (!this.stableFirst) {
                await this.stopLoss.track(profitData.fiatProfit, this.stableTokenInvestment, profitData.exchangeAmount, profitData.fiatRate);
                await this.takeProfit.track(profitData.fiatProfit, this.stableTokenInvestment, profitData.exchangeAmount, profitData.fiatRate);
              }
            } catch (err) {
              console.error(`[${new Date().toLocaleString()}] ${this.from.name}->${this.to.name} - Ocurrió un error al obtener información: ${err.message}`);
            }
          }, 2500);
        });
      });
    }
  }

  async getData() {
    // Obtiene el monto del token de salida
   const tokenAmount = await this.getTokenAmountExchanged();

    // Obtiene la tarifa 
    const stableRate = await this.getStableRate();

    // Establece los cálculos
    let fiatRate = stableRate*this.fiat;
    let stableProfit = (tokenAmount-this.stableTokenInvestment);
    let fiatProfit = (stableProfit*this.fiat);

    const profitData = { 
      rate: stableRate,
      fiatRate: fiatRate,
      investment: this.stableTokenInvestment,
      exchangeAmount: tokenAmount,
      stableProfit: stableProfit,
      fiatProfit: fiatProfit
    }

    return profitData;
  }

  async getTokenAmountExchanged() {
    const selector = 'token-amount-input';
    const type = 'swap-currency-output';

    // Obtiene el monto del token en el exchange
    await this.page.waitForSelector(`input[class*=${selector}]`);
    const tokenAmount = await this.page.evaluate(x => {
      const elements = document.getElementsByClassName(x.selector);

      // Busca el que tenga el parent correspondiente al tipo
      for (let ix in elements) {
        const parent = elements[ix].closest(`#${x.type}`);

        if (parent) {
          return elements[ix].value;
        }
      }
    }, { selector: selector, type: type });

    return tokenAmount;
  }

  async getStableRate() {
    const selector = 'MlLjM';

    // Obtiene la tarifa 
    await this.page.waitForSelector(`div[class*='${selector}']`);
    let stableRate = await this.page.evaluate(x => {
      let elements = document.getElementsByClassName(x);

      for (let ix in elements) {
        if (elements[ix].id !== 'pair' && elements[ix].textContent.includes("per")) {
          return elements[ix].textContent;
        }
      }
    }, selector);

    // Dependiendo si stable primero, reemplaza la descripción
    if (!this.stableFirst) {
      stableRate = stableRate.toString().replace(`${this.to.name} per ${this.from.name}`, '').trim();
    } else {
      stableRate = stableRate.toString().replace(`${this.from.name} per ${this.to.name}`, '').trim();
    }

    return stableRate;
  }

  async getPair() {
    const selector = '#pair';

    // Obtiene el par para validar si se seleccionó
    await this.page.waitForSelector(selector);
    let handle = await this.page.$(selector);
    const pair = await handle.evaluate(x => x.textContent);

    return pair;
  }

  async setCurrency(type, token, tokenText) {
    // Dispara evento click para seleccionar token
    await this.selectTokenForExchange(type);
    
    // Realiza busqueda del token
    await this.typeSearchToken(tokenText);

    // Selecciona el token
    await this.selectTokenOnSearch(token);

    // Obtiene el par para validar si se seleccionó
    const currentPair = await this.getPair();
  
    if (tokenText === currentPair) return true;
  }

  async selectTokenForExchange(type) {
    const selector = 'open-currency-select-button';

    // Selecciona el token para hacer el exchange
    await this.page.waitForSelector(`button[class*='${selector}']`);
    await this.page.evaluate(x => {
      const elements = document.getElementsByClassName(x.selector);

      // Busca el que tenga el parent correspondiente al tipo
      for (let ix in elements) {
        const parent = elements[ix].closest(`#${x.type}`);

        if (parent) {
          return elements[ix].click();
        }
      }
    }, { selector: selector, type: type });
  }

  async selectTokenOnSearch(token) {
    const selector = '.token-item-';

    // Selecciona el token en la busqueda
    await this.page.waitForSelector(selector + token);
    let handle = await this.page.$(selector + token);
    await handle.evaluate(x => x.click());
  }

  async changeToStablePrice() {
    const selector = '.sc-iKUVsf';

    // Cambia el valor a stable token
    await this.page.waitForSelector(selector);
    let handle = await this.page.$(selector);
    await handle.evaluate(x => x.click());
  }

  async typeInvestment() {
    const selector = '.token-amount-input';

    // Escribe el monto de inversión
    return this.page.type(selector, this.investment);
  }

  async typeSearchToken(token) {
    const selector = '#token-search-input';

    // Busca el token para seleccioanrlo
    return this.page.type(selector, token);
  }

  async disconnect() {
    clearInterval(this.interval);
  }
}

module.exports = Swap;