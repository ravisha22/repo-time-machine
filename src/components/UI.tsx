import type { ReactNode } from 'react'

export function Panel({
  children,
  title,
  eyebrow,
  action,
  className = '',
}: {
  children: ReactNode
  title?: string
  eyebrow?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || eyebrow || action) && (
        <header className="panel-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'cyan' | 'green' | 'amber' | 'violet' | 'red'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Stat({
  label,
  value,
  detail,
  tone = 'cyan',
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'cyan' | 'green' | 'amber' | 'violet' | 'red'
}) {
  return (
    <div className={`stat stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-state">
      <div className="loading-orbit">
        <i />
        <i />
        <i />
      </div>
      <strong>{label}</strong>
    </div>
  )
}
