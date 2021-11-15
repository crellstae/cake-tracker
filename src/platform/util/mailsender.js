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