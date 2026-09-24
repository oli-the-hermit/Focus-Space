import React from 'react';

export interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  /** Highlights the tile with the accent fill. */
  accent?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, value, label, accent = false }) => {
  return (
    <div className={`card stat-card ${accent ? 'is-accent' : ''}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-val">{value}</div>
      <div className="stat-card-lbl">{label}</div>
    </div>
  );
};
