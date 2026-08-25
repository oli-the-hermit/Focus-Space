import React from 'react';

export interface IconGripProps extends React.HTMLAttributes<HTMLSpanElement> {
  title?: string;
}

export const IconGrip: React.FC<IconGripProps> = ({ title, className = 'drag-handle', ...props }) => (
  <span className={className} title={title} {...props}>
    ⋮⋮
  </span>
);
