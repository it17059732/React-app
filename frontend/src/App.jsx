import React, { useEffect, useState, useCallback } from 'react';
import { api, GATEWAY_URL } from './api.js';
import UsersPanel from './panels/UsersPanel.jsx';
import ProductsPanel from './panels/ProductsPanel.jsx';
import OrdersPanel from './panels/OrdersPanel.jsx';
import ServiceStrip from './components/ServiceStrip.jsx';

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' }
];

export default function App() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  const refreshAll = useCallback(async () => {
    try {
      const [u, p, o] = await Promise.all([api.getUsers(), api.getProducts(), api.getOrders()]);
      setUsers(u);
      setProducts(p);
      setOrders(o);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <div>
            <h1>Ops Console</h1>
            <p className="subtitle">API &middot; {GATEWAY_URL || 'same origin'}</p>
          </div>
        </div>
        <ServiceStrip />
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-index">{t.id === 'users' ? '01' : t.id === 'products' ? '02' : '03'}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="banner-error">
          Couldn't reach a service &mdash; {error}. Is the gateway running on {GATEWAY_URL}?
        </div>
      )}

      <main className="content">
        {tab === 'users' && <UsersPanel users={users} onChange={refreshAll} />}
        {tab === 'products' && <ProductsPanel products={products} onChange={refreshAll} />}
        {tab === 'orders' && (
          <OrdersPanel orders={orders} users={users} products={products} onChange={refreshAll} />
        )}
      </main>
    </div>
  );
}
