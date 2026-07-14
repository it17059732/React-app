const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'products', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', service: 'products', db: 'unreachable' });
  }
});

app.get('/products', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, price::float AS price, stock FROM products ORDER BY id');
  res.json(rows);
});

app.get('/products/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, price::float AS price, stock FROM products WHERE id = $1',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

app.post('/products', async (req, res) => {
  const { name, price, stock } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name and price are required' });
  const { rows } = await pool.query(
    'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING id, name, price::float AS price, stock',
    [name, price, stock || 0]
  );
  res.status(201).json(rows[0]);
});

app.put('/products/:id', async (req, res) => {
  const { name, price, stock } = req.body;
  const { rows } = await pool.query(
    `UPDATE products SET name = COALESCE($1, name), price = COALESCE($2, price), stock = COALESCE($3, stock)
     WHERE id = $4 RETURNING id, name, price::float AS price, stock`,
    [name, price, stock, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

// Used internally by the orders service to check/reserve stock.
// Runs inside a transaction with a row lock (SELECT ... FOR UPDATE) so
// concurrent orders for the same product can't both pass the stock check.
app.post('/products/:id/reserve', async (req, res) => {
  const { quantity } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, stock FROM products WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    if (rows[0].stock < quantity) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Insufficient stock' });
    }
    const { rows: updated } = await client.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 RETURNING id, name, price::float AS price, stock',
      [quantity, req.params.id]
    );
    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to reserve stock' });
  } finally {
    client.release();
  }
});

app.delete('/products/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Product not found' });
  res.status(204).send();
});

app.listen(PORT, () => console.log(`Products service running on port ${PORT}`));
