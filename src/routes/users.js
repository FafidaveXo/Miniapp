import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();


// Upsert user by telegram_id
router.post('/upsert', async (req, res) => {
const { telegram_id, name, phone, language = 'am' } = req.body;
if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });
const [r] = await pool.query(
`INSERT INTO users (telegram_id, name, phone, language)
VALUES (?,?,?,?)
ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), language=VALUES(language)`,
[telegram_id, name, phone, language]
);
const [rows] = await pool.query('SELECT * FROM users WHERE telegram_id=?', [telegram_id]);
res.json(rows[0]);
});


export default router;