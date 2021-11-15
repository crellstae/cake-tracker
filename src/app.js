var ipc = require('electron').ipcRenderer;
const utils = require('./util/utils');
const formatter = require('./platform/util/formatter');

let currentSellCurrency = 'BUSD';
let globalCakeStaked = 0.00;
let globalFiatProfit = 0.00;
let globalStableRate = 0.00;
let globalFiatStaking = 0.00;
let globalFiatTotalProfit = 0.00;

window.addEventListener('DOMContentLoaded', () => {
  attachStartButton();
  attachStopButton();
  attachOnChangeSellCurrency(currentSellCurrency);
  changeSellCurrency(currentSellCurrency);
});

function attachOnChangeSellCurrency(currentSellCurrency) {
  const sellCurrencySelect = document.getElementById('sellCurrency');
  sellCurrencySelect.addEventListener('change', (e) => {
    const value = e.currentTarget.value;
    currentSellCurrency = value;
    changeSellCurrency(currentSellCurrency);
  });
}

function attachStartButton() {
  const startButton = document.getElementById('start-button');
  startButton.addEventListener('click', () => {
    if (!validateStartButton()) return;

    // Establece como de solo lectura ciertos campos
    setReadOnlyElements(true);

    // Muestra loading en los status
    setStatusTag('loading');

    // Mostrar loading de QR y ocultar imagen vacia
    utils.setClass('qr-modal', 'is-active');
    utils.removeClass('qr-loading', 'hide-element');
    utils.setClass('wallet-connect-qr', 'hide-element');

    // Toggle de botones de inicio/detener
    utils.toggleClass('start-button', 'hide-element');
    utils.toggleClass('stop-button', 'hide-element');

    // Obtiene el monto de inversión
    const investmentAmount = getStableTokenAmount();
    
    ipc.send('create-start-process', { stableTokenAmount: investmentAmount, stableToken: currentSellCurrency });
    ipc.send('create-staking-qr-service', { });
    ipc.send('create-buy-profit-service', { });
    ipc.send('create-sell-profit-service', { });
    ipc.send('start-process', { stableTokenAmount: investmentAmount, stableToken: currentSellCurrency });
    ipc.on('profit-process', (event, args) => {
      console.log(args);
      
      if (args.type === 'buy') {
        if (args.error) return setStatusTag('buy', 'is-danger');
        
        setBuyValue(args.fiatRate, args.rate);
        setStatusTag('buy', 'is-success');
      }

      if (args.type === 'sell') {
        if (args.error) return setStatusTag('sell', 'is-danger');

        setData(args);
        setSellValue(args.fiatRate, args.rate);
        setStatusTag('sell', 'is-success');
      }

      if (args.type === 'staking') {
        if (args.error) return setStatusTag('staking', 'is-danger');

        if (args.tokenProfit > 0) {
          utils.removeClass('qr-modal', 'is-active');
        }

        if (args.cakeStaked > 0 && globalCakeStaked <= 0) {
          ipc.send('sell-profit-service', { cakeStaked: args.cakeStaked });
          ipc.send('buy-profit-service', { });
        }

        setStakingData(args);
        setStatusTag('staking', 'is-success');
      }
    });

    ipc.on('staking-qr-service', (event, args) => {
      if (args.show) {
        // Ocultar loading y volver a mostrar imagen vacía para reemplazo
        utils.setClass('qr-loading', 'hide-element');
        utils.removeClass('wallet-connect-qr', 'hide-element');
        utils.setBase64Image('wallet-connect-qr', args.base64Image);

        // Lanzar llamada para iniciar captura de staking y lanzar servicio de venta
        ipc.send('staking-profit-service', { });
      }
    });
  });
}

function attachStopButton() {
  const startButton = document.getElementById('stop-button');
  startButton.addEventListener('click', () => {
    // Envia petición de desconexión y detiene procesos
    ipc.send('stop-process');
    ipc.removeAllListeners('profit-process');
    
    // Toggle para ocultar botones
    setReadOnlyElements(false);
    utils.toggleClass('stop-button', 'hide-element');
    utils.toggleClass('start-button', 'hide-element');
    utils.setEmptyImage('wallet-connect-qr');
    utils.removeClass('wallet-connect', 'hide-element');

    // Resetea tags
    setStatusTag('reset');
  });
}

function validateStartButton() {
  const investmentAmount = getStableTokenAmount();

  if (investmentAmount <= 0) {
    alert('El monto de inversión no es correcto.');
    return false;
  }

  return true;
}

function setData(data) {
  globalFiatProfit = data.fiatProfit;
  globalStableRate = data.rate;
  globalFiatTotalProfit = getTotalFiatProfit();

  utils.replaceValueById('stable-profit', formatter.token.format(data.stableProfit));
  utils.replaceValueById('fiat-profit', formatter.token.format(data.fiatProfit));
  utils.replaceValueById('fiat-total-profit', formatter.token.format(globalFiatTotalProfit));

  setBackgroundProfit(data);
}

function setStakingData(data) {
  globalCakeStaked = data.cakeStaked;
  globalFiatStaking = data.fiatProfit;
}

function setBackgroundProfit(data) {
  if (data.stableProfit >= 0) {
    utils.replaceTextById('stable-profit-text-type', 'Ganancias');
    utils.setClass('stable-profit', 'input-back-green');
  }
  else {
    utils.replaceTextById('stable-profit-text-type', 'Perdidas');
    utils.setClass('stable-profit', 'input-back-red');
  }

  if (data.fiatProfit >= 0) {
    utils.replaceTextById('fiat-profit-text-type', 'Ganancias');
    utils.setClass('fiat-profit', 'input-back-green');
  }
  else {
    utils.replaceTextById('fiat-profit-text-type', 'Perdidas');
    utils.setClass('fiat-profit', 'input-back-red');
  }

  if (globalFiatTotalProfit >= 0) {
    utils.replaceTextById('fiat-total-profit-text-type', 'Ganancias');
    utils.setClass('fiat-total-profit', 'input-back-green');
  }
  else {
    utils.replaceTextById('fiat-total-profit-text-type', 'Perdidas');
    utils.setClass('fiat-total-profit', 'input-back-red');
  }
}

function setBuyValue(fiat, rate) {
  utils.replaceTextById('buy-price', formatter.currency.format(fiat));
  utils.replaceTextById('buy-rate', `${formatter.token.format(rate)}`);
}

function setSellValue(fiat, rate) {
  utils.replaceTextById('sell-price', formatter.currency.format(fiat));
  utils.replaceTextById('sell-rate', `${formatter.token.format(rate)}`);
}

function setStatusTag(type, tag = '') {
  switch (type) {
    case 'buy':
      utils.setClass('buy-status', tag);
      utils.removeLoading('buy-status-loading');
      break;
    case 'sell':
      utils.setClass('sell-status', tag);
      utils.removeLoading('sell-status-loading');
      break;
    case 'staking':
      utils.setClass('staking-status', tag);
      utils.removeLoading('staking-status-loading');
      break;
    case 'loading':
      utils.setLoading('buy-status-loading');
      utils.setLoading('sell-status-loading');
      utils.setLoading('staking-status-loading');
      break;
    case 'reset':
      utils.removeClass('buy-status', 'is-danger');
      utils.removeClass('buy-status', 'is-success');
      utils.removeClass('sell-status', 'is-danger');
      utils.removeClass('sell-status', 'is-success');
      utils.removeClass('staking-status', 'is-danger');
      utils.removeClass('staking-status', 'is-success');
      utils.removeLoading('buy-status-loading');
      utils.removeLoading('sell-status-loading');
      utils.removeLoading('staking-status-loading');
      break;
  }
}

function getTotalFiatProfit() {
  return globalFiatTotalProfit = globalFiatProfit + globalFiatStaking;
}

function setReadOnlyElements(isReadOnly) {
  const investmentCakeInput = document.getElementById('investment-amount-cake');
  const investmentInput = document.getElementById('investment-amount');
  const sellCurrency = document.getElementById('sellCurrency');

  investmentCakeInput.readOnly = isReadOnly;
  investmentInput.readOnly = isReadOnly;
  sellCurrency.disabled = isReadOnly;
}

function changeSellCurrency(currentSellCurrency) {
  utils.replaceText('token-sell', currentSellCurrency);
}

function getStableTokenAmount() {
  const investmentAmount = document.getElementById('investment-amount').value;
  return investmentAmount;
}