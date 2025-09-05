import { Router } from 'express';
import { pool } from '../db.js';
import TelegramBot from 'node-telegram-bot-api';


const router = Router();
const botToken = process.env.BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;
const bot = botToken ? new TelegramBot(botToken, { polling: false }) : null;


router.post('/', async (req, res) => {
const { telegram_id, animal_id, quantity = 1, delivery_address, payment_method = 'cod' } = req.body;
if (!telegram_id || !animal_id) return res.status(400).json({ error: 'telegram_id and animal_id required' });


// find user
const [uRows] = await pool.query('SELECT * FROM users WHERE telegram_id=?', [telegram_id]);
if (!uRows[0]) return res.status(400).json({ error: 'user not found, upsert first' });
const user = uRows[0];


// find animal price
const [aRows] = await pool.query('SELECT * FROM animals WHERE id=? AND available=1', [animal_id]);
if (!aRows[0]) return res.status(400).json({ error: 'animal not available' });
const animal = aRows[0];


const total = Number(animal.price) * Number(quantity);
const [ins] = await pool.query(
`INSERT INTO orders (user_id, animal_id, quantity, delivery_address, total_price, payment_method, status)
VALUES (?,?,?,?,?,?, 'pending')`,
[user.id, animal_id, quantity, delivery_address, total, payment_method]
);


// Optionally mark animal unavailable if quantity is one-per-item model
await pool.query('UPDATE animals SET available=0 WHERE id=?', [animal_id]);


// Notify admin via Telegram
if (bot && adminChatId) {
const text = `🆕 New Order #${ins.insertId}\n👤 ${user.name || ''} (tg:${user.telegram_id})\n📦 ${animal.type} / ${animal.size} x${quantity}\n💵 ${total} ETB\n📍 ${delivery_address || '—'}\n💳 ${payment_method.toUpperCase()}`;
bot.sendMessage(adminChatId, text, { parse_mode: 'HTML' }).catch(() => {});
}


res.status(201).json({ id: ins.insertId, total_price: total, status: 'pending' });
});


export default router;