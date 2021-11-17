const nodemailer = require('nodemailer');
const config = require('./config');
const formatter = require('./formatter');

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
        info.subject = this.data.mail.templates.stopLoss.subject.replace('#FiatPerdidas#', formatter.token.format(data.fiatProfit));
        info.html = this.data.mail.templates.stopLoss.body
          .replace('#StopLoss#', data.stopLoss)
          .replace('#MXNTarifa#', formatter.token.format(data.fiatRate))
          .replace('#FiatPerdidas#', formatter.token.format(data.fiatProfit));
      break;
      case "take-profit":
        info.subject = this.data.mail.templates.takeProfit.subject.replace('#FiatGanancias#', formatter.token.format(data.fiatProfit));
        info.html = this.data.mail.templates.takeProfit.body
          .replace('#TakeProfit#', data.takeProfit)
          .replace('#MXNTarifa#', formatter.token.format(data.fiatRate))
          .replace('#FiatGanancias#', formatter.token.format(data.fiatProfit));
      break;
      case "staking":
        info.subject = this.data.mail.templates.staking.subject.replace('#FiatGanancias#', formatter.token.format(data.fiatProfitTotal));
        info.html = '';
        
        for (const token of data.tokens) {
          info.html += `
          <div style="border: 1px solid grey; border-radius: 5px; box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;">
            <div style="padding: 5px;">
              <span><img style="width: 20px; position: relative;" src="${token.logo.replace('.svg', '.png')}" /></span>
              <span style="padding-left: 5px; margin-top: -18px">
                <span>Token: <strong>${token.tokenName}</strong></span>&nbsp;
                <span>Ganado: <strong>${formatter.token.format(token.tokenProfit)}</strong></span>&nbsp;
                <span>USD: $<strong>${formatter.token.format(token.tokenUSDProfit)}</strong></span>&nbsp;
                <span>MXN: $<strong>${formatter.token.format(token.fiatProfit)}</strong></span>&nbsp;
                <span>APR: <strong>${token.apr}</strong></span>&nbsp;
                <span>Staked: <strong>${formatter.token.format(token.cakeStaked)}</strong></span>
              </span>
            </div>
          </div>
          <br />
          `;
        }
      break;
    }

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
}

module.exports = MailSender;