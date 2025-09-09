import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Telegram Bot Token (from Render env vars)
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Handle webhook updates from Telegram
router.post("/", async (req, res) => {
  try {
    const update = req.body;
    console.log("Incoming update:", update);

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Example: simple reply
      let replyText = "I didn’t understand that 🤔";
      if (text === "/start") {
        replyText = "🐐 Welcome to Beg Tera Store!\nType 'buy' to see options.";
      } else if (text.toLowerCase() === "buy") {
        replyText = "👉 You can buy Sheep here!";
      }

      // Send reply back to Telegram
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
        }),
      });
    }

    res.sendStatus(200); // Acknowledge Telegram
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.sendStatus(500);
  }
});

export default router;
