var ipc = require('electron').ipcRenderer;
const appScreenshot = require('./util/screenshot');
const utils = require('./util/utils');
const formatter = require('./platform/util/formatter');

let currentStableToken = 'BUSD';
let currentStakingDisable = false;
let globalStakedTokens = [];
let globalProfitStatus = 'Ganancias';
let globalCakeStaked = 0.00;
let globalBuyExchangedAmount = 0.00;
let globalBuyFiatExchangedAmount = 0.00;
let globalSellExchangedAmount = 0.00;
let globalSellFiatExchangedAmount = 0.00;
let globalStableProfit = 0.00;
let globalFiatProfit = 0.00;
let globalFiatStaking = 0.00;
let globalFiatTotalProfit = 0.00;
let stakingAlreadyPassed = false;
let stakingModalAlreadyHidden = false;

window.addEventListener('DOMContentLoaded', () => {
  attachStartButton();
  attachStopButton();
  attachDetailButton();
  attachCloseModal();
  attachOnChangeSellCurrency();
  attachOnCheckedStakingDisable()
  changeSellCurrency(currentStableToken);

  utils.setIdle('buy-status-image');
  utils.setIdle('sell-status-image');
  utils.setIdle('staking-status-image');
});

function attachOnChangeSellCurrency() {
  const input = document.getElementById('sellCurrency');

  input.addEventListener('change', (e) => {
    const value = e.currentTarget.value;
    currentStableToken = value;
    console.log(currentStableToken);
    changeSellCurrency(currentStableToken);
  });
}

function attachOnCheckedStakingDisable() {
  const input = document.getElementById('staking-disable');

  input.addEventListener('change', (e) => {
    const value = e.currentTarget.checked;
    currentStakingDisable = value;
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
    const stableInvestment = getStableTokenAmount();
    
    ipc.send('create-start-process-main', { stableInvestment: stableInvestment });
    ipc.send('create-staking-qr-service-main', { });
    ipc.send('create-swap-router-service-main', { });
    ipc.send('start-process-main', { stableInvestment: stableInvestment, stableToken: currentStableToken, stakingDisable: currentStakingDisable });

    ipc.on('profit-process-renderer', (event, result) => {
      console.log(result);

      // Establece los valores de venta
      if (result.sell !== undefined) {
        if (result.error) return setStatusTag('sell', 'is-danger');

        setData(result.sell);
        setSellSwap(result.sell);
        setSellValue(result.sell.fiatRate, result.sell.stableRate);
        setStatusTag('sell', 'is-success');

        if (currentStakingDisable && !stakingModalAlreadyHidden) {
          stakingModalAlreadyHidden = true;
        }
      }
      
      // Establece los valores de compra
      if (result.buy !== undefined) {
        if (result.error) return setStatusTag('buy', 'is-danger');
        
        setBuySwap(result.buy);
        setBuyValue(result.buy.fiatRate, result.buy.stableRate);
        setStatusTag('buy', 'is-success');
      }

      // Establece los valores de staking
      if (result.type === 'staking') {
        if (result.error) {
          if (!stakingAlreadyPassed) {
            const stopButton = getStopButton();
            stopButton.click();
          }

          return setStatusTag('staking', 'is-danger');
        }

        globalStakedTokens = result.tokens;

        stakingDataValidation(result);
        setStakingData(result);
        setStatusTag('staking', 'is-success');
      }

      if (result.type === 'staking-disabled' && currentStakingDisable) {
        const cakeInvestmentAmount = getCakeTokenAmount();

        ipc.send('swap-router-service-main', { cakeStaked: cakeInvestmentAmount });
      }
    });

    ipc.on('staking-qr-service-renderer', (event, result) => {
      if (result.show) {
        showQR(result);

        // Lanzar llamada para iniciar captura de staking y lanzar servicio de venta
        ipc.send('staking-profit-service-main', { });
      }

      if (result.loading) {
        console.log('Loading');
        console.log(result);
        showLoadingOnQRModal();
      }

      if (result.hide) {
        console.log('hide');
        console.log(result);
        hideQRModal();
      }
    });

    ipc.on('info-service-renderer', (event, result) => {
      appScreenshot((base64Image) => {
        if (globalStakedTokens.length <= 0 && !currentStakingDisable) return;

        const data = {
          stakedTokens: !currentStakingDisable ? globalStakedTokens : [],
          profitData: {
            profitStatus: globalProfitStatus,
            stableTokenName: currentStableToken,
            stableTokenProfit: globalStableProfit,
            stablePrecioCompra: globalBuyExchangedAmount,
            fiatPrecioCompra: globalBuyFiatExchangedAmount,
            stablePrecioVenta: globalSellExchangedAmount,
            fiatPrecioVenta: globalSellFiatExchangedAmount,
            fiatProfit: globalFiatProfit,
            fiatProfitTotal: globalFiatTotalProfit
          },
          screenshot: base64Image.replace('data:image/jpeg;base64,', '')
        }

        ipc.send('info-service-main', data);
      });
    });
  });
}

function attachStopButton() {
  const startButton = document.getElementById('stop-button');
  startButton.addEventListener('click', () => {
    stakingModalAlreadyHidden = false;
    globalCakeStaked = 0;
    
    // Envia petición de desconexión y detiene procesos
    ipc.send('stop-process-main');
    ipc.removeAllListeners('profit-process-renderer');
    ipc.removeAllListeners('staking-qr-service-renderer');
    ipc.removeAllListeners('screenshot-service-renderer');
    
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
  const cakeAmount = getCakeTokenAmount();

  if (investmentAmount <= 0) {
    alert('El monto de inversión no es correcto.');
    return false;
  }

  if (cakeAmount <= 0) {
    alert('El monto de inversión de cake no es correcto.');
    return false;
  }

  return true;
}

function setData(data) {
  globalStableProfit = data.stableProfit;
  globalFiatProfit = data.fiatProfit;
  globalFiatTotalProfit = getTotalFiatProfit();

  utils.replaceValueById('stable-profit', formatter.token.format(data.stableProfit));
  utils.replaceValueById('fiat-profit', formatter.token.format(data.fiatProfit));
  utils.replaceValueById('fiat-total-profit', formatter.token.format(globalFiatTotalProfit));

  setBackgroundProfit(data);
}

function setBuySwap(data) {
  utils.replaceTextById('token-buy-input', formatter.token.format(data.investment));
  utils.replaceTextById('token-buy-output', formatter.token.format(data.exchangedAmount));
  utils.replaceTextById('token-buy-fiat', formatter.token.format(data.fiatExchangedAmount));
}

function setSellSwap(data) {
  globalCakeStaked = getCakeTokenAmount();

  utils.replaceTextById('token-sell-input', formatter.token.format(globalCakeStaked));
  utils.replaceTextById('token-sell-output', formatter.token.format(data.exchangedAmount));
  utils.replaceTextById('token-sell-fiat', formatter.token.format(data.fiatExchangedAmount));
}

function setStakingData(data) {
  globalFiatStaking = data.tokens.reduce((s,o) => { return s+o.fiatProfit }, 0);
  
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
    stakingAlreadyPassed = true;
    globalCakeStaked = getCakeTokenAmount();

    // Llama a los servicios de compra/venta
    ipc.send('swap-router-service-main', { cakeStaked: globalCakeStaked.toString() });
  }
}

function setBackgroundProfit(data) {
  if (data.stableProfit >= 0) {
    globalProfitStatus = 'Ganancias';

    utils.replaceTextById('stable-profit-text-type', 'Ganancias');
    utils.setClass('stable-profit', 'input-back-green');
  }
  else {
    globalProfitStatus = 'Perdidas';

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
  globalBuyExchangedAmount = rate;
  globalBuyFiatExchangedAmount = fiat;
  
  utils.replaceTextById('buy-price', formatter.currency.format(fiat));
  utils.replaceTextById('buy-rate', `${formatter.token.format(rate)} ${currentStableToken}`);
}

function setSellValue(fiat, rate) {
  globalSellExchangedAmount = rate;
  globalSellFiatExchangedAmount = fiat;

  utils.replaceTextById('sell-price', formatter.currency.format(fiat));
  utils.replaceTextById('sell-rate', `${formatter.token.format(rate)} ${currentStableToken}`);
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

      if (!currentStakingDisable) utils.setLoading('staking-status-image');
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
  const investmentInput = document.getElementById('investment-amount');
  const sellCurrency = document.getElementById('sellCurrency');
  const stakingDisable = document.getElementById('staking-disable');

  investmentInput.readOnly = isReadOnly;
  sellCurrency.disabled = isReadOnly;
  stakingDisable.disabled = isReadOnly;
}

function changeSellCurrency(currentStableToken) {
  utils.replaceText('token-sell', currentStableToken);
}

function showQR(result) {
  // Ocultar loading y volver a mostrar imagen vacía para reemplazo
  utils.setClass('qr-loading', 'hide-element');
  utils.removeClass('wallet-connect-qr', 'hide-element');
  utils.setBase64Image('wallet-connect-qr', result.base64Image);
}

function showLoadingOnQRModal() {
  // Mostrar loading y volver a mostrar imagen vacía para reemplazo
  utils.removeClass('qr-loading', 'hide-element');
  utils.setClass('wallet-connect-qr', 'hide-element');
}

function hideQRModal() {
  // Quitar modal de QR y ocultar elementos
  utils.removeClass('qr-modal', 'is-active');
  utils.setClass('qr-loading', 'hide-element');
  utils.setClass('wallet-connect-qr', 'hide-element');
}

function getStopButton() {
  const button = document.getElementById('stop-button');
  
  return button;
}

function getStableTokenAmount() {
  const input = document.getElementById('investment-amount').value;
  return input;
}

function getCakeTokenAmount() {
  const input = document.getElementById('investment-amount-cake').value;
  return input;
}