import React, { forwardRef } from 'react';
import { cx } from '../../lib/cx';

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

/** Tonal surface that groups related content (styles: components/card.css). */
export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...rest }, ref) => (
  <div ref={ref} className={cx('card', className)} {...rest} />
));
Card.displayName = 'Card';

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** Tooltip for the title, which truncates with an ellipsis. */
  titleTooltip?: string;
  /** Small uppercase line above the title. */
  overline?: React.ReactNode;
  /** Chips or meta shown under the title. */
  subtitle?: React.ReactNode;
  /** Icon buttons on the right, grouped tightly. */
  actions?: React.ReactNode;
  /** Anything else on the right, unwrapped (e.g. a status chip). */
  aside?: React.ReactNode;
}

/** Large card header: title (with optional overline and subtitle row) and trailing actions. */
export const CardHeader: React.FC<CardHeaderProps> = ({ title, titleTooltip, overline, subtitle, actions, aside, className, ...rest }) => (
  <div className={cx('card-header', className)} {...rest}>
    <div className="card-header-main">
      {overline && <span className="overline">{overline}</span>}
      <h2 className="card-title" title={titleTooltip}>{title}</h2>
      {subtitle && <div className="card-subtitle-row">{subtitle}</div>}
    </div>
    {aside}
    {actions && <div className="card-header-actions">{actions}</div>}
  </div>
);

export interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** Usually a small tonal button. */
  action?: React.ReactNode;
}

/** Compact header for side panels: an uppercase label and one optional action. */
export const PanelHeader: React.FC<PanelHeaderProps> = ({ title, action, className, ...rest }) => (
  <div className={cx('panel-card-header', className)} {...rest}>
    <span className="panel-card-title">{title}</span>
    {action}
  </div>
);
