import TelegramBot from "node-telegram-bot-api";
import mysql from "mysql2/promise";

// Create bot (no polling)
const bot = new TelegramBot(process.env.BOT_TOKEN);

// --- MySQL connection pool ---
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const frontendUrl = process.env.FRONTEND_BUILD;
const ADMIN_ID = process.env.ADMIN_ID;

// --- Mini App button ---
const sendMiniAppButton = (chatId, text = "Open Store") => {
  const button = {
    text: "🛒 Open Store | መደብር ይክፈቱ",
    web_app: { url: frontendUrl },
  };
  bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: [[button]] } });
};

// --- Commands ---
bot.onText(/\/start/, (msg) => {
  const name = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ");
  sendMiniAppButton(msg.chat.id, `🐐 እንኳን ደህና መጡ ${name || ""}!`);
});

bot.onText(/\/store/, (msg) => sendMiniAppButton(msg.chat.id, "Click below to open the store:"));

bot.onText(/\/(help|about)/, (msg) => {
  bot.sendMessage(msg.chat.id, "🐐 Buy sheep & goats using the mini app.\nUse /store anytime to open the shop.");
});

// --- Handle Mini App Orders ---
bot.on("message", async (msg) => {
  if (!msg.web_app_data?.data) return;

  try {
    const data = JSON.parse(msg.web_app_data.data);
    if (data.action === "buy") {
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
    console.error("❌ Error processing order:", err);
    bot.sendMessage(msg.chat.id, "⚠️ Failed to process your order.");
  }
});

// --- Admin: Orders ---
bot.onText(/\/orders/, async (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return bot.sendMessage(msg.chat.id, "⚠️ Not authorized.");

  try {
    const [rows] = await db.execute(
      `SELECT id, user_id, animal_type, animal_name, price, created_at 
       FROM orders ORDER BY created_at DESC LIMIT 5`
    );

    if (!rows.length) return bot.sendMessage(msg.chat.id, "📭 No orders yet.");

    let message = "📦 Latest Orders:\n\n";
    rows.forEach(
      (o) =>
        (message += `🆔 ${o.id} | 👤 ${o.user_id} | ${o.animal_type} (${o.animal_name}) | 💰 ${o.price} ETB\n🕒 ${o.created_at}\n\n`)
    );
    bot.sendMessage(msg.chat.id, message);
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, "⚠️ Failed to fetch orders.");
  }
});

// --- Admin: Stats ---
bot.onText(/\/stats/, async (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return bot.sendMessage(msg.chat.id, "⚠️ Not authorized.");

  try {
    const [rows] = await db.execute(
      `SELECT animal_type, COUNT(*) AS count, SUM(price) AS total FROM orders GROUP BY animal_type`
    );

    if (!rows.length) return bot.sendMessage(msg.chat.id, "📊 No sales yet.");

    let message = "📊 Sales Summary:\n\n";
    let grandTotal = 0;
    rows.forEach((r) => {
      message += `${r.animal_type} → ${r.count} sold, ${r.total} ETB total\n`;
      grandTotal += Number(r.total);
    });
    message += `\n💰 Grand Total: ${grandTotal} ETB`;

    bot.sendMessage(msg.chat.id, message);
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, "⚠️ Failed to fetch stats.");
  }
});

// ✅ Export bot for webhook
export default bot;
