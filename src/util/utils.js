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
  setEmptyImage: (selector, className) => {
    const element = document.getElementById(selector);

    element.src = './content/qr.png';
  },
  setQRImage: (selector, className) => {
    const element = document.getElementById(selector);

    element.src = './content/qr.png';
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