import React from 'react';

export interface StatCardProps {
  icon: string;
  value: string;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => {
  return (
    <div className="card stat-card">
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-val">{value}</div>
      <div className="stat-card-lbl">{label}</div>
    </div>
  );
};
