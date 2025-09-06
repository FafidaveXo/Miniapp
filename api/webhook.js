import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.BOT_TOKEN);

// Handle /start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Sheep & Goat Store 🐑🐐", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open Store", web_app: { url: process.env.FRONTEND_BUILD } }]
      ]
    }
  });
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await bot.processUpdate(req.body);
      return res.status(200).send("ok");
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).send("error");
    }
  }
  return res.status(405).send("Method not allowed");
}
