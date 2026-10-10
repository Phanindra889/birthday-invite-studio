import React, { useId } from 'react';
import { Icon } from './icons';

export const Section: React.FC<{ title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }> = ({ title, description, actions, children }) => (
  <section className="section">
    <header className="section-head">
      <div>
        <h3>{title}</h3>
        {description && <p className="section-desc">{description}</p>}
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </header>
    {children}
  </section>
);

export const Field: React.FC<{
  label: string;
  hint?: React.ReactNode;
  issue?: { level: 'error' | 'warning'; message: string };
  optional?: boolean;
  children: (id: string) => React.ReactNode;
  trailing?: React.ReactNode;
}> = ({ label, hint, issue, optional, children, trailing }) => {
  const id = useId();
  return (
    <div className={`field${issue ? ` has-${issue.level}` : ''}`}>
      <div className="field-label">
        <label htmlFor={id}>
          {label}
          {optional && <span className="optional">optional</span>}
        </label>
        {trailing}
      </div>
      {children(id)}
      {issue ? (
        <p className={`field-msg ${issue.level}`} role={issue.level === 'error' ? 'alert' : undefined}>
          <Icon name={issue.level === 'error' ? 'warning' : 'info'} size={14} /> {issue.message}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
};

export const TextInput: React.FC<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { onChange: (v: string) => void }> = ({ onChange, ...rest }) => (
  <input className="input" {...rest} onChange={(e) => onChange(e.target.value)} />
);

export const TextArea: React.FC<Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & { onChange: (v: string) => void }> = ({ onChange, ...rest }) => (
  <textarea className="input textarea" rows={2} {...rest} onChange={(e) => onChange(e.target.value)} />
);

export function Select<T extends string | number>({ id, value, options, onChange, ariaLabel }: { id?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel?: string }) {
  return (
    <select
      id={id}
      className="input select"
      aria-label={ariaLabel}
      value={String(value)}
      onChange={(e) => {
        const o = options.find((x) => String(x.value) === e.target.value);
        if (o) onChange(o.value);
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export const Slider: React.FC<{
  id?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  ariaLabel?: string;
}> = ({ id, value, min, max, step = 1, onChange, format, ariaLabel }) => (
  <div className="slider">
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
    />
    <output className="slider-value">{format ? format(value) : value}</output>
  </div>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; description?: string }> = ({ checked, onChange, label, description }) => (
  <label className="toggle">
    <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="toggle-track" aria-hidden>
      <span className="toggle-thumb" />
    </span>
    <span className="toggle-text">
      <span className="toggle-label">{label}</span>
      {description && <span className="toggle-desc">{description}</span>}
    </span>
  </label>
);

export function Segmented<T extends string | number>({ value, options, onChange, ariaLabel, size }: { value: T; options: { value: T; label: React.ReactNode; disabled?: boolean; title?: string }[]; onChange: (v: T) => void; ariaLabel: string; size?: 'sm' }) {
  return (
    <div className={`segmented${size === 'sm' ? ' sm' : ''}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          title={o.title}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'; icon?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  variant = 'secondary',
  icon,
  size = 'md',
  className,
  children,
  ...rest
}) => (
  <button type="button" className={`btn btn-${variant} btn-${size}${className ? ` ${className}` : ''}`} {...rest}>
    {icon && <Icon name={icon} size={size === 'sm' ? 15 : 18} />}
    {children}
  </button>
);

export const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
  const id = useId();
  return (
    <div className="color-field">
      <label htmlFor={id} className="color-swatch" style={{ background: value }}>
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={`${label} color`} />
      </label>
      <div className="color-meta">
        <span className="color-name">{label}</span>
        <input
          className="color-hex"
          value={value}
          aria-label={`${label} hex value`}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase());
          }}
          maxLength={7}
        />
      </div>
    </div>
  );
};

export const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; icon?: string }> = ({ active, onClick, children, icon }) => (
  <button type="button" className={`chip${active ? ' active' : ''}`} aria-pressed={active} onClick={onClick}>
    {icon && <Icon name={icon} size={14} />}
    {children}
  </button>
);

export const Callout: React.FC<{ tone?: 'info' | 'warning' | 'error' | 'success'; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <div className={`callout ${tone}`} role={tone === 'error' ? 'alert' : undefined}>
    <Icon name={tone === 'success' ? 'check' : tone === 'info' ? 'info' : 'warning'} size={16} />
    <div>{children}</div>
  </div>
);
