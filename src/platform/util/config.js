const fs = require('fs');
const path = require('path');

let configJson = undefined;

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
  data: function () { return data.json() }
}