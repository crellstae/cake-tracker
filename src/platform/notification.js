const ipc = require('electron').ipcMain;
const Telegram = require('./util/telegram');
const config = require('./util/config');
const utils = require('./util/utils');
const formatter = require('./util/formatter');

class Notification {
  notificationCountdownTime = 1800; // Diferencia de 30 minutos entre correo
  notificationCountdownRenewTime = 0; // Diferencia de 2 horas una vez el pool llenado (Inhabilitado)
  notificationPool = []; // Pool notificaciones, hasta 5 en espera hasta renovar
  lastNotificationSent = undefined;

  constructor(type) {
    this.type = type;
    this.data = config.data();
    this.telegram = new Telegram();
  }

  async trackAlert(profitData) {
    const notifyData = { message: '' };

    if (this.validationByType(profitData.fiatRate)) {
    
      if (this.type === 'alert-buy') {
        notifyData.message += this.data.telegram.templates.alertBuy.title;
        notifyData.message += this.data.telegram.templates.alertBuy.message.toString().replaceAll(',', '')
          .replace('#StableToken#', profitData.stableTokenName)
          .replace('#FiatPrecio#', formatter.token.format(profitData.fiatRate))
          .replace('#StablePrecio#', formatter.token.format(profitData.stableRate));

        this.send(async () => {
          this.telegram.sendMessage(notifyData);
        });
      }

      if (this.type === 'alert-sell') {
        notifyData.message += this.data.telegram.templates.alertSell.title;
        notifyData.message += this.data.telegram.templates.alertSell.message.toString().replaceAll(',', '')
          .replace('#StableToken#', profitData.stableTokenName)
          .replace('#FiatPrecio#', formatter.token.format(profitData.fiatRate))
          .replace('#StablePrecio#', formatter.token.format(profitData.stableRate));

        this.send(async () => {
          await this.telegram.sendMessage(notifyData);
        });
      }
    }
  }

  async trackStaking(tokens) {
    const fiatProfitTotal = tokens.reduce((s,o) => { return s+o.fiatProfit }, 0);
    const notifyData = { message: '' };

    notifyData.message += this.data.telegram.templates.staking.title;

    for (const token of tokens) {
      notifyData.message += this.data.telegram.templates.staking.message.toString().replaceAll(',', '')
        .replace('#TokenName#', token.tokenName)
        .replace('#TokenProfit#', formatter.token.format(token.tokenProfit))
        .replace('#USDProfit#', formatter.token.format(token.tokenUSDProfit))
        .replace('#FiatProfit#', formatter.token.format(token.fiatProfit))
        .replace('#TokenAPR#', token.apr)
        .replace('#CakeStaked#', formatter.token.format(token.cakeStaked));
    }

    notifyData.message += this.data.telegram.templates.staking.footer.toString()
      .replace('#fiatProfitTotal#', formatter.token.format(fiatProfitTotal));

    this.send(async () => {
      await this.telegram.sendMessage(notifyData);
    });
  }

  async trackInfo() {
    const notifyData = { message: '' };

    notifyData.message += this.data.telegram.templates.info.title;
    notifyData.message += this.data.telegram.templates.staking.title;

    await this.send(async () => {
      await this.getInfo(async (data) => {
        const fiatStakingTotal = data.stakedTokens.reduce((s,o) => { return s+o.fiatProfit }, 0);
  
        for (const token of data.stakedTokens) {
          notifyData.message += this.data.telegram.templates.staking.message.toString().replaceAll(',', '')
            .replace('#TokenName#', token.tokenName)
            .replace('#TokenProfit#', formatter.token.format(token.tokenProfit))
            .replace('#FiatProfit#', formatter.token.format(token.fiatProfit))
            .replace('#TokenAPR#', token.apr)
            .replace('#CakeStaked#', formatter.token.format(token.cakeStaked));
        }
  
        notifyData.message += this.data.telegram.templates.info.message.toString().replaceAll(',', '')
          .replaceAll('#ProfitStatus#', data.profitData.profitStatus)
          .replace('#StableToken#', data.profitData.stableTokenName)
          .replace('#StableTokenProfit#', formatter.token.format(data.profitData.stableTokenProfit))
          .replace('#FiatProfit#', formatter.token.format(data.profitData.fiatProfit))
          .replace('#FiatStakingTotal#', formatter.token.format(fiatStakingTotal))
          .replace('#FiatProfitTotal#', formatter.token.format(data.profitData.fiatProfitTotal));
  
        notifyData.photo = data.screenshot;
  
        await this.telegram.sendPhoto(notifyData);
      });
    });
  }

  async trackProfit(fiatRate, fiatProfit, investmentStableValue, sellStableValue) {
    const typeValue = this.getTypeValue(investmentStableValue);
    const stableProfit = this.getStableProfit(investmentStableValue, typeValue);
    const notifyData = { photo: undefined,  message: '' };
    
    if (this.validationByType(sellStableValue, stableProfit)) {
      if (this.type === 'stop-loss') {
        notifyData.message += this.data.telegram.templates.stopLoss.title;
        notifyData.message += this.data.telegram.templates.stopLoss.message.toString().replaceAll(',', '')
          .replace('#StopLoss#', this.data.main.stopLoss)
          .replace('#MXNTarifa#', formatter.token.format(fiatRate))
          .replace('#MXNPerdidas#', formatter.token.format(fiatProfit));

        this.send(async () => {
          await this.telegram.sendMessage(notifyData);
        });
      }

      if (this.type === 'take-profit') {
        notifyData.message += this.data.telegram.templates.takeProfit.title;
        notifyData.message += this.data.telegram.templates.takeProfit.message.toString().replaceAll(',', '')
          .replace('#TakeProfit#', this.data.main.takeProfit)
          .replace('#MXNTarifa#', formatter.token.format(fiatRate))
          .replace('#MXNGanancias#', formatter.token.format(fiatProfit));

        this.send(async () => {
          await this.telegram.sendMessage(notifyData);
        });
      }
    }
  }

  async send(callback) {
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

        if (this.type === 'stop-loss' || this.type === 'take-profit') await callback();
        else await callback();;
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

        if (this.type === 'stop-loss' || this.type === 'take-profit') await callback();
        else await callback();
      }
    }
  }

  validationByType(currentPrice, stableProfit = 0) {
    if (this.type === 'stop-loss') return (currentPrice <= stableProfit);
    if (this.type === 'take-profit') return (currentPrice >= stableProfit);
    if (this.type === 'alert-buy') return (currentPrice <= this.data.main.alerts.buyPriceEqualOrMinorThan);
    if (this.type === 'alert-sell') return (currentPrice >= this.data.main.alerts.sellPriceEqualOrMayorThan);
  }

  getTypeValue(investmentStableValue) {
    if (this.type === 'stop-loss') return (investmentStableValue*this.data.main.stopLoss/100);
    if (this.type === 'take-profit') return (investmentStableValue*this.data.main.takeProfit/100);
  }

  getStableProfit(investmentStableValue, typeValue) {
    const investment = parseFloat(investmentStableValue);
    const type = parseFloat(typeValue);

    if (this.type === 'stop-loss') return investment-type;
    if (this.type === 'take-profit') return investment+type;
  }

  async getInfo(callback) {
    const win = config.getWin();
    win.webContents.send('info-service-renderer', {});

    ipc.once('info-service-main', async (event, args) => {
      if (args === undefined) return undefined;

      console.log(`[${new Date().toLocaleString()}] Se obtiene info y screenshot.`);

      await callback(args);
    });
  }
}

module.exports = Notification;