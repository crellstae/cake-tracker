process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

class Telegram {

  constructor() {
    this.config = config.data();
    this.api = config.telegramAPI;
    this.bot = new TelegramBot(this.config.telegram.token, { polling: false });
  }

  async sendMessage(data) {
    await this.bot.sendMessage(this.config.telegram.channel, data.message, { parse_mode: 'html' });
  }

  async sendPhoto(data) {
    await this.bot.sendPhoto(this.config.telegram.channel, Buffer.from(data.photo, 'base64'), { caption: data.message, parse_mode: 'html' }, { filename: 'data', contentType: 'application/octet-stream' });
  }
}

module.exports = Telegram;