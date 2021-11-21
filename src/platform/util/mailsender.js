const nodemailer = require('nodemailer');
const config = require('./config');
const formatter = require('./formatter');
const ipc = require('electron').ipcMain;

class MailSender {
  constructor() {
    this.transporter = this.getTransporter();
  }

  async send(type, data) {
    const info = {
      from: this.data.mailer.from,
      to: this.data.mail.recipients
    };

    switch (type) {
      case "stop-loss":
        await this.getScreenshot((screenshot) => {
          this.sendStopLoss(type, data, screenshot);
        });
        break;
      case "take-profit":
        await this.getScreenshot((screenshot) => {
          this.sendTakeProfit(type, data, screenshot);
        });
        break;
      case "staking":
        info.subject = this.data.mail.templates.staking.subject.replace('#FiatGanancias#', formatter.token.format(data.fiatProfitTotal));
        info.html = '';
        
        for (const token of data.tokens) {
          info.html += this.data.mail.templates.staking.body.toString().replaceAll(',','')
            .replace('#TokenLogo#', token.logo.replace('.svg', '.png'))
            .replace('#TokenName#', token.tokenName)
            .replace('#TokenProfit#', formatter.token.format(token.tokenProfit))
            .replace('#USDProfit#', formatter.token.format(token.tokenUSDProfit))
            .replace('#FiatProfit#', formatter.token.format(token.fiatProfit))
            .replace('#TokenAPR#', token.apr)
            .replace('#CakeStaked#', formatter.token.format(token.cakeStaked));
        }
        break;
      case "alert-buy":
        info.subject = this.data.mail.templates.alertBuy.subject.replace('#FiatPrecio#', formatter.token.format(data.fiatRate));
        info.html = this.data.mail.templates.alertBuy.body.toString().replaceAll(',','')
          .replace('#FiatPrecio#', formatter.token.format(data.fiatRate))
          .replace('#StablePrice#', formatter.token.format(data.rate))
        break;
      case "alert-sell":
        info.subject = this.data.mail.templates.alertSell.subject.replace('#FiatPrecio#', formatter.token.format(data.fiatRate));
        info.html = this.data.mail.templates.alertSell.body.toString().replaceAll(',','')
          .replace('#FiatPrecio#', formatter.token.format(data.fiatRate))
          .replace('#StablePrice#', formatter.token.format(data.rate))
        break;
    }

    if (type === 'stop-loss' || type === 'take-profit') return;

    try {
      await this.transporter.sendMail(info);
      console.log(`[${new Date().toLocaleString()}] Se ha enviado email de tipo: ${type}`);
    } catch (err) {
      console.error(`[${new Date().toLocaleString()}] Ocurrió un error al enviar notificación: ${err.message}`);
    }
  }

  async sendStopLoss(type, data, screenshot) {
    const info = {
      from: this.data.mailer.from,
      to: this.data.mail.recipients,
      attachments: [{
        filename: 'app-screenshot.jpg',
        path: screenshot,
        encoding: 'base64',
        cid: 'screenshot'
      }]
    };

    info.subject = this.data.mail.templates.stopLoss.subject.replace('#FiatPerdidas#', formatter.token.format(data.fiatProfit));
    info.html = this.data.mail.templates.stopLoss.body.toString().replaceAll(',','')
      .replace('#StopLoss#', data.stopLoss)
      .replace('#MXNTarifa#', formatter.token.format(data.fiatRate))
      .replace('#FiatPerdidas#', formatter.token.format(data.fiatProfit));

    await this.makeCall(type, info);
  }

  async sendTakeProfit(type, data, screenshot) {
    const info = {
      from: this.data.mailer.from,
      to: this.data.mail.recipients,
      attachments: [{
        filename: 'app-screenshot.jpg',
        path: screenshot,
        encoding: 'base64',
        cid: 'screenshot'
      }]
    };

    info.subject = this.data.mail.templates.takeProfit.subject.replace('#FiatGanancias#', formatter.token.format(data.fiatProfit));
    info.html = this.data.mail.templates.takeProfit.body.toString().replaceAll(',','')
      .replace('#TakeProfit#', data.takeProfit)
      .replace('#MXNTarifa#', formatter.token.format(data.fiatRate))
      .replace('#FiatGanancias#', formatter.token.format(data.fiatProfit));

    await this.makeCall(type, info);
  }

  async makeCall(type, info) {
    try {
      await this.transporter.sendMail(info);
      console.log(`[${new Date().toLocaleString()}] Se ha enviado email de tipo: ${type}`);
    } catch (err) {
      console.error(`[${new Date().toLocaleString()}] Ocurrió un error al enviar notificación: ${err.message}`);
    }
  }

  getTransporter() {
    this.data = config.data();

    const transporter = nodemailer.createTransport({
      host: this.data.mailer.security.host,
      port: this.data.mailer.security.port,
      secure: this.data.mailer.security.ssl,
      auth: {
        user: this.data.mailer.auth.user,
        pass: this.data.mailer.auth.pass
      },
    });

    return transporter;
  }

  async getScreenshot(callback) {
    const win = config.getWin();
    win.webContents.send('screenshot-service', {});

    ipc.once('screenshot-service', async (event, args) => {
      if (args === undefined) return undefined;

      await callback(args);
    });
  }
}

module.exports = MailSender;