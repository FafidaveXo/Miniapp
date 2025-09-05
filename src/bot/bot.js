import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import bodyParser from 'body-parser';
import ngrok from '@ngrok/ngrok';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 5000;
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;
const NGROK_DOMAIN = process.env.NGROK_DOMAIN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_LOCAL = process.env.FRONTEND_LOCAL;
const FRONTEND_BUILD = process.env.FRONTEND_BUILD;
const ADMIN_ID = process.env.ADMIN_ID;

if (!BOT_TOKEN) {
  console.error('❌ Telegram Bot Token not provided in .env');
  process.exit(1);
}

const isDev = NODE_ENV.toLowerCase() === 'development';
const frontendUrl = isDev ? FRONTEND_LOCAL : FRONTEND_BUILD;

if (!frontendUrl) {
  console.error('❌ Web App URL not defined. Check FRONTEND_LOCAL / FRONTEND_BUILD and NODE_ENV in .env');
  process.exit(1);
}

const app = express();
app.use(bodyParser.json());

// --- MySQL connection pool ---
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// --- Telegram bot ---
const bot = new TelegramBot(BOT_TOKEN, { polling: !isDev });

// --- Telegram webhook endpoint (for production) ---
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// --- Serve frontend (production) ---
if (!isDev && FRONTEND_BUILD) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// --- Send Mini App button ---
const sendMiniAppButton = (chatId, text = 'Open Store') => {
  const button = { text: '🛒 Open Store | መደብር ይክፈቱ', web_app: { url: frontendUrl } };
  bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: [[button]] } });
};

// --- /start ---
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ');
  sendMiniAppButton(chatId, `🐐 እንኳን ደህና መጡ ${name || ''}!`);
});

// --- /store ---
bot.onText(/\/store/, (msg) => sendMiniAppButton(msg.chat.id, 'Click below to open the store:'));

// --- /help ---
bot.onText(/\/(help|about)/, (msg) => {
  bot.sendMessage(msg.chat.id, '🐐 Buy sheep & goats using the mini app.\nUse /store anytime to open the shop.');
});

// --- Handle Mini App Orders ---
bot.on('message', async (msg) => {
  if (!msg.web_app_data?.data) return;

  try {
    const data = JSON.parse(msg.web_app_data.data);
    if (data.action === 'buy') {
      const animal = data.animal;
      const [result] = await db.execute(
        `INSERT INTO orders (user_id, animal_type, animal_name, price) VALUES (?, ?, ?, ?)`,
        [msg.from.id, animal.type, animal.name, animal.price]
      );

      await bot.sendMessage(
        msg.chat.id,
        `✅ Order saved!\n🆔 Order ID: ${result.insertId}\n📦 ${animal.type} (${animal.name})\n💰 ${animal.price} ETB`
      );
    }
  } catch (err) {
    console.error('❌ Error processing order:', err);
    bot.sendMessage(msg.chat.id, '⚠️ Failed to process your order.');
  }
});

// --- Admin: /orders ---
bot.onText(/\/orders/, async (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return bot.sendMessage(msg.chat.id, '⚠️ Not authorized.');

  try {
    const [rows] = await db.execute(
      `SELECT id, user_id, animal_type, animal_name, price, created_at 
       FROM orders ORDER BY created_at DESC LIMIT 5`
    );

    if (!rows.length) return bot.sendMessage(msg.chat.id, '📭 No orders yet.');

    let message = '📦 Latest Orders:\n\n';
    rows.forEach(o => message += `🆔 ${o.id} | 👤 ${o.user_id} | ${o.animal_type} (${o.animal_name}) | 💰 ${o.price} ETB\n🕒 ${o.created_at}\n\n`);
    bot.sendMessage(msg.chat.id, message);
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, '⚠️ Failed to fetch orders.');
  }
});

// --- Admin: /stats ---
bot.onText(/\/stats/, async (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return bot.sendMessage(msg.chat.id, '⚠️ Not authorized.');

  try {
    const [rows] = await db.execute(
      `SELECT animal_type, COUNT(*) AS count, SUM(price) AS total FROM orders GROUP BY animal_type`
    );

    if (!rows.length) return bot.sendMessage(msg.chat.id, '📊 No sales yet.');

    let message = '📊 Sales Summary:\n\n';
    let grandTotal = 0;
    rows.forEach(r => { message += `${r.animal_type} → ${r.count} sold, ${r.total} ETB total\n`; grandTotal += Number(r.total); });
    message += `\n💰 Grand Total: ${grandTotal} ETB`;

    bot.sendMessage(msg.chat.id, message);
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, '⚠️ Failed to fetch stats.');
  }
});

// --- Start server ---
app.listen(PORT, async () => {
  console.log(`🚀 API running on port ${PORT}`);
  console.log(`⚡ Mode: ${NODE_ENV}`);

  if (!isDev) {
    try {
      const listener = await ngrok.connect({ addr: PORT, authtoken: NGROK_AUTHTOKEN, domain: NGROK_DOMAIN });
      const publicUrl = listener.url();
      console.log(`🌍 Ngrok tunnel: ${publicUrl}`);

      await bot.deleteWebHook();
      await bot.setWebHook(`${publicUrl}/webhook`);
      console.log('✅ Telegram webhook registered');
    } catch (err) {
      console.error('⚠️ Ngrok / webhook error:', err.message);
    }
  } else {
    console.log('⚡ Dev mode: using local frontend, ngrok not required');
  }
});
