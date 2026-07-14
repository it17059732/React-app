CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0
);

INSERT INTO products (name, price, stock) VALUES
  ('Keyboard', 49.99, 100),
  ('Mouse', 19.99, 200);
