import React from 'react';

const STEPS = [
  { id: 'gateway', label: 'Gateway' },
  { id: 'orders', label: 'Orders' },
  { id: 'users', label: 'Users' },
  { id: 'products', label: 'Products' }
];

// activeStep: null (idle) | 'gateway' | 'orders' | 'fanout' | 'done' | 'error'
export default function RequestPipeline({ activeStep }) {
  const isLit = (id) => {
    if (!activeStep) return false;
    if (activeStep === 'error') return false;
    if (id === 'gateway') return true;
    if (id === 'orders') return ['orders', 'fanout', 'done'].includes(activeStep);
    if (id === 'users' || id === 'products') return ['fanout', 'done'].includes(activeStep);
    return false;
  };

  return (
    <div className="pipeline" aria-hidden="true">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className={`pipeline-node ${isLit(step.id) ? 'pipeline-node-lit' : ''}`}>
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`pipeline-edge ${isLit(STEPS[i + 1].id) ? 'pipeline-edge-lit' : ''}`} />
          )}
        </React.Fragment>
      ))}
      {activeStep === 'error' && <span className="pipeline-error-tag">failed</span>}
    </div>
  );
}
