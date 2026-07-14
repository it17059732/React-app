import React, { useEffect, useState } from 'react';
import { GATEWAY_URL } from '../api.js';

// All health checks go through the gateway (or, behind a k8s Ingress,
// through the same origin the frontend was served from) rather than
// hitting each service's port directly - individual service ports
// aren't reachable from the browser once you're not on Docker Compose.
const SERVICES = [
  { id: 'users', label: 'Users', path: '/healthz/users' },
  { id: 'products', label: 'Products', path: '/healthz/products' },
  { id: 'orders', label: 'Orders', path: '/healthz/orders' }
];

async function ping(path) {
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export default function ServiceStrip() {
  const [status, setStatus] = useState(() =>
    Object.fromEntries(SERVICES.map((s) => [s.id, null]))
  );

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const results = await Promise.all(SERVICES.map((s) => ping(s.path)));
      if (cancelled) return;
      setStatus(Object.fromEntries(SERVICES.map((s, i) => [s.id, results[i]])));
    }

    check();
    const interval = setInterval(check, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="service-strip" title="Service health, polled every 8s">
      {SERVICES.map((s) => (
        <div key={s.id} className="service-dot-wrap">
          <span
            className={
              status[s.id] === null
                ? 'service-dot dot-pending'
                : status[s.id]
                ? 'service-dot dot-up'
                : 'service-dot dot-down'
            }
          />
          <span className="service-dot-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
