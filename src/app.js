var ipc = require('electron').ipcRenderer;
const appScreenshot = require('./util/screenshot');
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
  attachDetailButton();
  attachCloseModal();
  attachOnChangeSellCurrency(currentSellCurrency);
  changeSellCurrency(currentSellCurrency);

  utils.setIdle('buy-status-image');
  utils.setIdle('sell-status-image');
  utils.setIdle('staking-status-image');
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

      // Establece los valores de venta
      if (args.type === 'sell') {
        if (args.error) return setStatusTag('sell', 'is-danger');

        setData(args);
        setSellSwap(args);
        setSellValue(args.fiatRate, args.rate);
        setStatusTag('sell', 'is-success');
      }
      
      // Establece los valores de compra
      if (args.type === 'buy') {
        if (args.error) return setStatusTag('buy', 'is-danger');
        
        setBuySwap(args);
        setBuyValue(args.fiatRate, args.rate);
        setStatusTag('buy', 'is-success');
      }

      // Establece los valores de staking
      if (args.type === 'staking') {
        if (args.error) return setStatusTag('staking', 'is-danger');

        stakingDataValidation(args);
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

    ipc.on('screenshot-service', (event, args) => {
      appScreenshot((base64Image) => {
        ipc.send('screenshot-service', base64Image);
      });
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

    // Resetea tags
    setStatusTag('reset');
  });
}

function attachDetailButton() {
  const elements = document.getElementsByClassName('detail-image');
  const buttons = Array.from(elements);

  buttons.forEach((el, ix, data) => {
    el.addEventListener('click', (event) => {
      const type = event.currentTarget.getAttribute('data');
      utils.setClass(type, 'is-active');
    });
  });
}

function attachCloseModal() {
  const elements = document.getElementsByClassName('modal-close');
  const buttons = Array.from(elements);

  buttons.forEach((el, ix, data) => {
    el.addEventListener('click', (event) => {
      const type = event.currentTarget.getAttribute('data');
      utils.removeClass(type, 'is-active');
    });
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

function setBuySwap(data) {
  utils.replaceTextById('token-buy-input', formatter.token.format(data.investment));
  utils.replaceTextById('token-buy-output', formatter.token.format(data.exchangeAmount));
  utils.replaceTextById('token-buy-fiat', formatter.token.format(data.fiatExchanged));
}

function setSellSwap(data) {
  utils.replaceTextById('token-sell-input', formatter.token.format(globalCakeStaked));
  utils.replaceTextById('token-sell-output', formatter.token.format(data.exchangeAmount));
  utils.replaceTextById('token-sell-fiat', formatter.token.format(data.fiatExchanged));
}

function setStakingData(data) {
  globalCakeStaked = data.tokens.reduce((s,o) => { return parseFloat(s)+parseFloat(o.cakeStaked) }, 0);
  globalFiatStaking = data.tokens.reduce((s,o) => { return s+o.fiatProfit }, 0);
  
  utils.replaceValueById('investment-amount-cake', formatter.token.format(globalCakeStaked));
  utils.replaceValueById('staking-profit', formatter.token.format(globalFiatStaking));

  for (const token of data.tokens) {
    utils.updateTokenToStaking('staking-rows', token);
  }
}

function stakingDataValidation(data) {
  if (globalFiatStaking > 0) {
    utils.removeClass('qr-modal', 'is-active');
  }

  if (globalCakeStaked <= 0) {
    const cakeStaked = data.tokens.reduce((s,o) => { return parseFloat(s)+parseFloat(o.cakeStaked) }, 0);

    utils.removeClass('qr-loading', 'hide-element');
    utils.setClass('wallet-connect-qr', 'hide-element');

    // Llama a los servicios de compra/venta
    ipc.send('sell-profit-service', { cakeStaked: cakeStaked.toString() });
    ipc.send('buy-profit-service', { });
  }
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

  if (globalFiatStaking >= 0) {
    utils.setClass('staking-profit', 'input-back-green');
  }
}

function setBuyValue(fiat, rate) {
  utils.replaceTextById('buy-price', formatter.currency.format(fiat));
  utils.replaceTextById('buy-rate', `${formatter.token.format(rate)} ${currentSellCurrency}`);
}

function setSellValue(fiat, rate) {
  utils.replaceTextById('sell-price', formatter.currency.format(fiat));
  utils.replaceTextById('sell-rate', `${formatter.token.format(rate)} ${currentSellCurrency}`);
}

function setStatusTag(type, tag = '') {
  switch (type) {
    case 'buy':
      utils.setClass('buy-status', tag);
      utils.removeImage('buy-status-image');
      setStatusImage(type, tag);
      break;
    case 'sell':
      utils.setClass('sell-status', tag);
      utils.removeImage('sell-status-image');
      setStatusImage(type, tag);
      break;
    case 'staking':
      utils.setClass('staking-status', tag);
      utils.removeImage('staking-status-image');
      setStatusImage(type, tag);
      break;
    case 'loading':
      utils.setLoading('buy-status-image');
      utils.setLoading('sell-status-image');
      utils.setLoading('staking-status-image');
      break;
    case 'reset':
      utils.removeClass('buy-status', 'is-danger');
      utils.removeClass('buy-status', 'is-success');
      utils.removeClass('sell-status', 'is-danger');
      utils.removeClass('sell-status', 'is-success');
      utils.removeClass('staking-status', 'is-danger');
      utils.removeClass('staking-status', 'is-success');
      utils.removeImage('buy-status-image');
      utils.removeImage('sell-status-image');
      utils.removeImage('staking-status-image');
      utils.setIdle('buy-status-image');
      utils.setIdle('sell-status-image');
      utils.setIdle('staking-status-image');
      break;
  }
}

function setStatusImage(type, tag) {
  switch (tag) {
    case 'is-success':
      utils.setSuccess(`${type}-status-image`);
      break;
    case 'is-danger':
      utils.setError(`${type}-status-image`);
      break;
    case 'is-idle':
      utils.setIdle(`${type}-status-image`);
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