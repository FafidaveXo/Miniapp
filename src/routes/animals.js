import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();


// List available animals
router.get('/', async (req, res) => {
const [rows] = await pool.query('SELECT * FROM animals WHERE available=1 ORDER BY type, size');
res.json(rows);
});


// (Optional) create animal – for admin seeding via API
router.post('/', async (req, res) => {
const { type, size, weight_range, price, image_url, available = true } = req.body;
const [r] = await pool.query(
'INSERT INTO animals (type,size,weight_range,price,image_url,available) VALUES (?,?,?,?,?,?)',
[type, size, weight_range, price, image_url, available]
);
res.status(201).json({ id: r.insertId });
});


export default router;