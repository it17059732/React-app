const express = require('express');
const axios = require('axios');
const cors = require('cors');
const pool = require('./db');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4003;
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:4001';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4002';

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'orders', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', service: 'orders', db: 'unreachable' });
  }
});

app.get('/orders', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, user_id AS "userId", user_name AS "userName", product_id AS "productId",
            product_name AS "productName", quantity, total::float AS total, status
     FROM orders ORDER BY id`
  );
  res.json(rows);
});

app.get('/orders/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, user_id AS "userId", user_name AS "userName", product_id AS "productId",
            product_name AS "productName", quantity, total::float AS total, status
     FROM orders WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  res.json(rows[0]);
});

// Creating an order calls the users service (to validate the user)
// and the products service (to validate + reserve stock), then
// persists the resulting order in its own database.
app.post('/orders', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId || !quantity) {
    return res.status(400).json({ error: 'userId, productId, and quantity are required' });
  }

  try {
    const userRes = await axios.get(`${USERS_SERVICE_URL}/users/${userId}`);
    const productRes = await axios.get(`${PRODUCTS_SERVICE_URL}/products/${productId}`);

    // Reserve stock on the products service
    await axios.post(`${PRODUCTS_SERVICE_URL}/products/${productId}/reserve`, { quantity });

    const total = Number((productRes.data.price * quantity).toFixed(2));
    const { rows } = await pool.query(
      `INSERT INTO orders (user_id, user_name, product_id, product_name, quantity, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
       RETURNING id, user_id AS "userId", user_name AS "userName", product_id AS "productId",
                 product_name AS "productName", quantity, total::float AS total, status`,
      [userId, userRes.data.name, productId, productRes.data.name, quantity, total]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.response) {
      // Bubble up the downstream service's error
      return res.status(err.response.status).json({ error: err.response.data.error || 'Downstream service error' });
    }
    console.error(err.message);
    res.status(502).json({ error: 'A downstream service is unavailable' });
  }
});

app.listen(PORT, () => console.log(`Orders service running on port ${PORT}`));
