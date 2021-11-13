module.exports = {
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