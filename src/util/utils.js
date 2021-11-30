const formatter = require('../platform/util/formatter');

module.exports = {
  updateTokenToStaking: (selector, data) => {
    const rowElement = document.getElementById('staking-rows');
    const id = data.tokenName.replace(' ', '-').toLowerCase();
    const name = data.tokenName;
    const profit = formatter.token.format(data.tokenProfit);
    const usd = formatter.token.format(data.tokenUSDProfit);
    const fiat = formatter.token.format(data.fiatProfit);
    const apr = data.apr;
    const staked = formatter.token.format(data.cakeStaked);

    // Si no existe el token en staking, lo crea
    let tokenRow = rowElement.querySelector(`#staking-token-${id}`);
    if (tokenRow === undefined || tokenRow === null) {
      // Si no existe, lo inserta
      tokenRow = document.createElement('div');
      tokenRow.id = `staking-token-${id}`;
      tokenRow.classList.add('box');
      tokenRow.innerHTML = `
        <span><img class="token-staking-logo" src="${data.logo}" /></span>
        <span class="token-staking-detail">
          <span style="font-size: 12px;">${name}: <span class="data-bold" id="token-staking-profit">${profit}</span>&nbsp;</span>
          <span style="font-size: 12px;">MXN $: <span class="data-bold" id="token-staking-fiat">${fiat}</span>&nbsp;</span>
          <span style="font-size: 12px;">APR: <span class="data-bold" id="token-staking-apr">${apr}</span>&nbsp;</span>
          <span style="font-size: 12px;">STAKED: <span class="data-bold" id="token-staking-staked">${staked}</span>&nbsp;</span>
        </span>
      `;

      rowElement.appendChild(tokenRow);
      return;
    };

    // Si ya existe, lo actualiza
    module.exports.replaceTextByIdAndQuerySelector(tokenRow, '#token-staking-profit', profit);
    module.exports.replaceTextByIdAndQuerySelector(tokenRow, '#token-staking-fiat', fiat);
    module.exports.replaceTextByIdAndQuerySelector(tokenRow, '#token-staking-apr', apr);
    module.exports.replaceTextByIdAndQuerySelector(tokenRow, '#token-staking-staked', staked);
  },
  replaceText: (selector, text) => {
    const elements = document.getElementsByClassName(selector);

    for (let x in elements) {
      elements[x].innerText = text;
    }
  },
  replaceTextById: (selector, text) => {
    const element = document.getElementById(selector);
    element.innerText = text;
  },
  replaceValueById: (selector, text) => {
    const element = document.getElementById(selector);
    element.value = text;
  },
  replaceTextByIdAndQuerySelector: (source, selector, text) => {
    const element = source.querySelector(selector);
    if (element !== undefined) element.textContent = text;
  },
  toggleClass: (selector, className) => {
    const element = document.getElementById(selector);
    
    if (!element.classList.contains(className)) element.classList.add(className);
    else element.classList.remove(className);
  },
  setEmptyImage: (selector) => {
    const element = document.getElementById(selector);

    element.src = './content/empty.png';
  },
  setBase64Image: (selector, base64Image) => {
    const element = document.getElementById(selector);

    element.src = 'data:image/png;base64,' + base64Image;
  },
  setQRImage: (selector) => {
    const element = document.getElementById(selector);

    element.src = './content/qr.png';
  },
  setIdle: (selector) => {
    const element = document.getElementById(selector);

    element.style.backgroundImage = "url('./content/idle.png')";
  },
  setLoading: (selector) => {
    const element = document.getElementById(selector);

    element.style.backgroundImage = "url('./content/loading.gif')";
  },
  setSuccess: (selector) => {
    const element = document.getElementById(selector);

    element.style.backgroundImage = "url('./content/success.png')";
  },
  setError: (selector) => {
    const element = document.getElementById(selector);

    element.style.backgroundImage = "url('./content/error.png')";
  },
  removeImage: (selector) => {
    const element = document.getElementById(selector);

    element.style.backgroundImage = '';
  },
  setClass: (selector, className) => {
    const element = document.getElementById(selector);
    
    if (!element.classList.contains(className)) element.classList.add(className);
  },
  removeClass: (selector, className) => {
    const element = document.getElementById(selector);
    
    if (element.classList.contains(className)) element.classList.remove(className);
  },
};