module.exports = {
  currency: new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 4
  }),
  token: new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 4
  })
}