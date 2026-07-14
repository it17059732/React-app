import React, { useState } from 'react';
import { api } from '../api.js';

export default function ProductsPanel({ products, onChange }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || price === '') return;
    setBusy(true);
    setFormError(null);
    try {
      await api.createProduct({ name, price: Number(price), stock: Number(stock) || 0 });
      setName('');
      setPrice('');
      setStock('');
      onChange();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    await api.deleteProduct(id);
    onChange();
  }

  return (
    <section className="panel-grid">
      <div className="panel">
        <h2>Products <span className="count">{products.length}</span></h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.id}</td>
                <td>{p.name}</td>
                <td className="mono">${p.price.toFixed(2)}</td>
                <td className={`mono ${p.stock < 10 ? 'stock-low' : ''}`}>{p.stock}</td>
                <td>
                  <button className="btn-ghost-danger" onClick={() => handleDelete(p.id)}>
                    remove
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={5} className="empty-row">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <h2>Add product</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mechanical keyboard" />
        </label>
        <label>
          Price (USD)
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="49.99"
          />
        </label>
        <label>
          Starting stock
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="100"
          />
        </label>
        {formError && <p className="form-error">{formError}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Adding…' : 'Add product'}
        </button>
      </form>
    </section>
  );
}
