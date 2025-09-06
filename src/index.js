import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';

const app = express();
app.use(bodyParser.json());

// Load from .env
const PORT = process.env.PORT || 5000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const NODE_ENV = process.env.NODE_ENV;

const frontendUrl =
  NODE_ENV === 'development'
    ? process.env.FRONTEND_LOCAL
    : process.env.FRONTEND_BUILD;

console.log(`⚡ Mode: ${NODE_ENV}`);
console.log(`🌍 Frontend URL: ${frontendUrl}`);

// Setup bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome to Sheep & Goat Store 🐑🐐", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open Store", web_app: { url: frontendUrl } }]
      ]
    }
  });
});

// Start backend
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
