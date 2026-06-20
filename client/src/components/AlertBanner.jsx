import React from 'react';
import { AlertTriangle, UserCheck } from 'lucide-react';

function AlertBanner({ systemStatus, caregiver, onResetAlert }) {
  if (systemStatus.caregiverAlerted) {
    return (
      <div className="alert-banner">
        <div className="alert-icon-wrapper">
          <AlertTriangle size={24} />
        </div>
        <div className="alert-details">
          <h3 className="alert-title">⚠️ Caregiver Alert System Triggered</h3>
          <p className="alert-desc">{systemStatus.alertReason}</p>
          <div className="alert-meta">
            Dispatched notification: SMS &amp; Email alerts active • Sent to:{' '}
            {caregiver.name} ({caregiver.phone}) •{' '}
            {systemStatus.lastNotificationSent
              ? new Date(systemStatus.lastNotificationSent).toLocaleTimeString()
              : 'Recent'}
          </div>
        </div>
        <button className="btn-resolve" onClick={onResetAlert}>
          Mark Alert Resolved
        </button>
      </div>
    );
  }

  return (
    <div className="alert-banner resolved">
      <div className="alert-icon-wrapper">
        <UserCheck size={20} />
      </div>
      <div className="alert-details">
        <h3 className="alert-title" style={{ color: 'var(--accent-emerald)' }}>
          Caregiver Status: Normal
        </h3>
        <p className="alert-desc" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
          Monitoring adherence routines. Emergency contact:{' '}
          <strong>{caregiver.name}</strong> ({caregiver.relationship}). Alert
          triggers after <strong>{caregiver.alertThreshold}</strong> missed doses.
        </p>
      </div>
    </div>
  );
}

export default AlertBanner;
