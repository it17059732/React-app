import React, { useState } from 'react';
import { api } from '../api.js';

export default function UsersPanel({ users, onChange }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.createUser({ name, email });
      setName('');
      setEmail('');
      onChange();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    await api.deleteUser(id);
    onChange();
  }

  return (
    <section className="panel-grid">
      <div className="panel">
        <h2>Users <span className="count">{users.length}</span></h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="mono">{u.id}</td>
                <td>{u.name}</td>
                <td className="mono muted">{u.email}</td>
                <td>
                  <button className="btn-ghost-danger" onClick={() => handleDelete(u.id)}>
                    remove
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="empty-row">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <h2>Add user</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dana Ruiz" />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dana@example.com"
          />
        </label>
        {formError && <p className="form-error">{formError}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Adding…' : 'Add user'}
        </button>
      </form>
    </section>
  );
}
