import React, { useState } from 'react';
import { api } from '../api.js';
import RequestPipeline from '../components/RequestPipeline.jsx';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function OrdersPanel({ orders, users, products, onChange }) {
  const [userId, setUserId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [step, setStep] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId || !productId || !quantity) return;
    setBusy(true);
    setFormError(null);

    setStep('gateway');
    await wait(250);
    setStep('orders');
    await wait(250);
    setStep('fanout');

    try {
      await api.createOrder({ userId: Number(userId), productId: Number(productId), quantity: Number(quantity) });
      setStep('done');
      setQuantity(1);
      onChange();
    } catch (err) {
      setStep('error');
      setFormError(err.message);
    } finally {
      setBusy(false);
      setTimeout(() => setStep(null), 1400);
    }
  }

  return (
    <section className="panel-grid orders-grid">
      <div className="panel">
        <h2>Orders <span className="count">{orders.length}</span></h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono">{o.id}</td>
                <td>{o.userName}</td>
                <td>{o.productName}</td>
                <td className="mono">{o.quantity}</td>
                <td className="mono">${o.total.toFixed(2)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={5} className="empty-row">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel form-panel">
        <h2>Place order</h2>
        <p className="hint">
          This calls the gateway, which hits Orders, which in turn calls Users and Products directly to validate and reserve stock.
        </p>

        <RequestPipeline activeStep={step} />

        <form onSubmit={handleSubmit}>
          <label>
            User
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select a user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <label>
            Product
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} &mdash; ${p.price.toFixed(2)}</option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? 'Placing…' : 'Place order'}
          </button>
        </form>
      </div>
    </section>
  );
}
