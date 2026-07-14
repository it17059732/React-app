const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'users', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', service: 'users', db: 'unreachable' });
  }
});

app.get('/users', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM users ORDER BY id');
  res.json(rows);
});

app.get('/users/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email',
      [name, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/users/:id', async (req, res) => {
  const { name, email } = req.body;
  const { rows } = await pool.query(
    `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email)
     WHERE id = $3 RETURNING id, name, email`,
    [name, email, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.delete('/users/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
  res.status(204).send();
});

app.listen(PORT, () => console.log(`Users service running on port ${PORT}`));
