const fs = require('fs');
const path = require('path');

let configJson = undefined;
let win = undefined;

const data = {
  json: () => {
    if (configJson === undefined) {
      fs.readFile(path.join('./config.json'), 'utf8' , (err, json) => {
        if (err) {
          console.error(err);
          return;
        }
  
        configJson = JSON.parse(json);
      });
    }
    
    return configJson;
  }
}

module.exports = {
  pancakeSwapURL: 'https://pancakeswap.finance/swap',
  pancakeSwapStakingURL: 'https://pancakeswap.finance/pools',
  telegramAPI: 'https://api.telegram.org/bot#BotToken#/',
  fiatEndpoints: {
    mxn: 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno?token=75f5d205522e66e45c2f1e86ea2de8ba9567b92b581db32d4a187a4b5a1b20cb'
  },
  data: function () { return data.json() },
  setWin: function(data) { 
    if (win === undefined) win = data;

    return win;
  },
  getWin: function() { return win }
}