import express from "express";
import bodyParser from "body-parser";
import '../src/webhook.js';
import webhookRoutes from './webhook.js';

import bot from "../bot/bot.js";

const app = express();
app.use(bodyParser.json());

// Telegram webhook
app.use("/api/webhook", webhookRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Backend running on port ${PORT}`);

  // Set Telegram webhook dynamically
  const url = process.env.RENDER_EXTERNAL_URL; // e.g., https://beg-tera-backend.onrender.com
  if (url) {
    await bot.setWebHook(`${url}/api/webhook`);
    console.log(`✅ Telegram webhook set: ${url}/api/webhook`);
  } else {
    console.warn("⚠️ RENDER_EXTERNAL_URL not set, webhook not registered.");
  }
});
