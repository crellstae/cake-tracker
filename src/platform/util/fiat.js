const fetch = require('cross-fetch');

async function getFiatValue() {
  const mexicanPesoWS = await fetch('https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno?token=75f5d205522e66e45c2f1e86ea2de8ba9567b92b581db32d4a187a4b5a1b20cb');
  return JSON.parse(await mexicanPesoWS.text()).bmx.series[0].datos[0].dato;
}

module.exports = {
  value: getFiatValue()
}