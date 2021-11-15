module.exports = {
  currency: new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }),
  token: new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 2
  })
}