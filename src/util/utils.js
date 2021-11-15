const formatter = require('../platform/util/formatter');

module.exports = {
  updateTokenToStaking: (selector, data) => {
    const rowElement = document.getElementById('staking-rows');
    const name = data.tokenName;
    const profit = formatter.token.format(data.tokenProfit);
    const usd = formatter.token.format(data.tokenUSDProfit);
    const fiat = formatter.token.format(data.fiatProfit);
    const staked = formatter.token.format(data.cakeStaked);

    // Si no existe el token en staking, lo crea
    let tokenRow = rowElement.querySelector(`#staking-token-${name.toLowerCase()}`);
    if (tokenRow === undefined || tokenRow === null) {
      // Si no existe, lo inserta
      tokenRow = document.createElement('div');
      tokenRow.id = `staking-token-${name.toLowerCase()}`;
      tokenRow.classList.add('box');
      tokenRow.innerHTML = `
        <span><img class="token-staking-logo" src="${data.logo}" /></span>
        <span class="token-staking-detail">
          <span style="font-size: 12px;">${name}: <span id="token-staking-profit">${profit}</span>&nbsp;|</span>
          <span style="font-size: 12px;">USD: <span id="token-staking-usd">${usd}</span>&nbsp;|</span>
          <span style="font-size: 12px;">MXN: <span id="token-staking-fiat">${fiat}</span>&nbsp;|</span>
          <span style="font-size: 12px;">STAKED: <span id="token-staking-staked">${staked}</span>&nbsp;</span>
        </span>
      `;

      rowElement.appendChild(tokenRow);
      return;
    };

    // Si ya existe, lo actualiza
    module.exports.replaceTextByIdAndQuerySelector(tokenRow, '#token-staking-profit', profit);
    module.exports.replaceTextByIdAndQuerySelector(tokenRow, '#token-staking-usd', usd);
    module.exports.replaceTextByIdAndQuerySelector(tokenRow, '#token-staking-fiat', fiat);
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
  setLoading: (selector) => {
    const element = document.getElementById(selector);

    element.style.backgroundImage = "url('./content/loading.gif')"

  },
  removeLoading: (selector) => {
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