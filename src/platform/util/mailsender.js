const nodemailer = require('nodemailer');
const config = require('./config');

class MailSender {
  constructor() {
    this.config = config.mailer;
  }

  async send() {

  }
}

module.exports = MailSender;