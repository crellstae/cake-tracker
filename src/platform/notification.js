const MailSender = require('./util/mailsender');
const config = require('./util/config');
const utils = require('./util/utils');

class Notification {
  notificationCountdownTime = 1800; // Diferencia de 30 minutos entre correo
  notificationCountdownRenewTime = 0; // Diferencia de 2 horas una vez el pool llenado (Inhabilitado)
  notificationPool = []; // Pool notificaciones, hasta 5 en espera hasta renovar
  lastNotificationSent = undefined;

  constructor(type) {
    this.type = type;
    this.mailSender = new MailSender();
    this.data = config.data();
  }

  async trackStaking(tokens) {
    const fiatProfitTotal = tokens.reduce((s,o) => { return s+o.fiatProfit }, 0);
    const notifyData = {
      fiatProfitTotal: fiatProfitTotal,
      tokens: tokens
    };

    this.send(notifyData);
  }

  async trackProfit(fiatProfit, investmentStableValue, sellStableValue, fiatRate) {
    const typeValue = this.getTypeValue(investmentStableValue);
    const stableProfit = this.getStableProfit(investmentStableValue, typeValue);
    const notifyData = { stopLoss: this.data.saved.stopLoss, fiatRate: fiatRate, fiatProfit: fiatProfit };
    
    if (this.validationByType(sellStableValue, stableProfit)) {
      this.send(notifyData);
    }
  }

  async send(notifyData) {
    // Establece la fecha de la última ejecución si es primera vez
    if (this.lastNotificationSent === undefined) this.lastNotificationSent = new Date();
      
    // Establece la fecha actual de ejecución
    const currentNotificationTime = new Date();

    // Revisa si ya pasó el tiempo de los 5 minutos
    if (utils.diffBetweeenDatesInSeconds(currentNotificationTime, this.lastNotificationSent) >= this.notificationCountdownTime) {
      // Solo permite enviar correo si el pool no esta lleno
      if (this.notificationPool.length < 5) {
        // Agrega el envio actual al pool
        this.notificationPool.push(currentNotificationTime);

        // Envia el correo
        this.lastNotificationSent = new Date();
        await this.mailSender.send(this.type, notifyData);
      } else {
        // Si la diferencia de la fecha actual y la última notificación excede de las 6 horas, limpia el pool
        if (utils.diffBetweeenDatesInSeconds(new Date(), this.lastNotificationSent) >= this.notificationCountdownRenewTime) {
          if (this.notificationPool.length >= 5) this.notificationPool = [];
        }
      }
    } else {
      // Llega a este punto cuando es la primera ejecución, no hay diferencia de fechas y el pool esta vacío
      if (this.notificationPool.length === 0) {
        this.notificationPool.push(currentNotificationTime);
        this.lastNotificationSent = new Date();
        await this.mailSender.send(this.type, notifyData);
      }
    }
  }

  validationByType(sellStableValue, stableProfit) {
    if (this.type === 'stop-loss') return (sellStableValue <= stableProfit);
    if (this.type === 'take-profit') return (sellStableValue >= stableProfit);
  }

  getTypeValue(investmentStableValue) {
    if (this.type === 'stop-loss') return (investmentStableValue*this.data.saved.stopLoss/100);
    if (this.type === 'take-profit') return (investmentStableValue*this.data.saved.takeProfit/100);
  }

  getStableProfit(investmentStableValue, typeValue) {
    const investment = parseFloat(investmentStableValue);
    const type = parseFloat(typeValue);

    if (this.type === 'stop-loss') return investment-type;
    if (this.type === 'take-profit') return investment+type;
  }
}

module.exports = Notification;