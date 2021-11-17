const fetch = require('cross-fetch');
const config = require('./config');

async function getFiatValue() {
  const mexicanPesoWS = await fetch(config.fiatEndpoints.mxn);
  return JSON.parse(await mexicanPesoWS.text()).bmx.series[0].datos[0].dato;
}

module.exports = {
  value: getFiatValue()
}