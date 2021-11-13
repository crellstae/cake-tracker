const fs = require('fs');

async function getConfig() {
  fs.readFile('./config.json', 'utf8' , (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    return JSON.parse(data);
  });
}

module.exports = {
  pancakeSwapURL: 'https://pancakeswap.finance/swap',
  pancakeSwapStakingURL: 'https://pancakeswap.finance/pools',
  config: getConfig()
}