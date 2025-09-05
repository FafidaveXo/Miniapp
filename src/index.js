import 'dotenv/config';
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import ngrok from '@ngrok/ngrok';

const app = express();
const PORT = process.env.PORT || 5000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const FRONTEND_PORT = 5173;

const isDev = process.env.NODE_ENV === 'development';
const frontendLocal = process.env.FRONTEND_LOCAL;
const frontendBuild = process.env.FRONTEND_BUILD;
const ngrokDomain = process.env.NGROK_DOMAIN;

// Initialize Telegram bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Start Express server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});

// Function to update Telegram Mini App URL
async function updateMiniAppUrl(url) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "🐑 Sheep & Goat Store",
          web_app: { url },
        },
      }),
    });
    console.log(`🔄 Mini App URL updated: ${url}`);
  } catch (err) {
    console.error("❌ Failed to update Mini App URL:", err);
  }
}

// Start ngrok in production and set frontend URL
let frontendUrl;

(async function initFrontend() {
  if (isDev) {
    frontendUrl = frontendLocal;
    console.log(`🌍 Dev frontend URL: ${frontendUrl}`);
  } else {
    // Start ngrok
    const listener = await ngrok.connect({
      addr: FRONTEND_PORT,
      authtoken_from_env: true,
      subdomain: ngrokDomain.replace(".ngrok-free.app", ""),
    });
    frontendUrl = listener.url();
    console.log(`🌍 Production frontend URL: ${frontendUrl}`);
  }

  // Update Telegram Mini App button
  await updateMiniAppUrl(frontendUrl);

  // Optional: auto-refresh every 60s to keep Telegram updated
  setInterval(() => updateMiniAppUrl(frontendUrl), 60_000);
})();

// /start command → send button to open Mini App
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const urlToUse = isDev ? frontendLocal : frontendUrl || frontendBuild;

  bot.sendMessage(chatId, "Welcome to Sheep & Goat Store!", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open Store 🐑🐐", web_app: { url: urlToUse } }]
      ]
    }
  });
});
