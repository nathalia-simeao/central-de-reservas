import React from "react";
import "../../styles/pmy-design-system.css";

const ICON_PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h2M14 14h2M8 18h2"/></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
  bookings: <><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M8 11h8M8 15h5"/></>,
  ranking: <><path d="M8 21V11h4v10M14 21V5h4v16M2 21v-6h4v6M2 21h18"/></>,
  link: <><path d="M8.5 14.5l-2 2a3.5 3.5 0 105 5l2-2"/><path d="M15.5 9.5l2-2a3.5 3.5 0 10-5-5l-2 2"/><path d="M9 15l6-6"/></>,
  users: <><path d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></>,
  automation: <><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/><circle cx="12" cy="12" r="4"/></>,
  media: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-5-5L5 20"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.1V21h-4v-.1A1.7 1.7 0 008.6 19.4a1.7 1.7 0 00-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-.6-1 1.7 1.7 0 00-1.1-.4H3v-4h.1A1.7 1.7 0 004.6 8.6a1.7 1.7 0 00-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-.6 1.7 1.7 0 00.4-1.1V3h4v.1A1.7 1.7 0 0015.4 4.6a1.7 1.7 0 001.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0019.4 9c.16.38.4.72.72 1 .3.27.7.41 1.1.4H21v4h-.1a1.7 1.7 0 00-1.5.6z"/></>,
  chevronDown: <path d="M6.5 9.5 12 15l5.5-5.5"/>,
  chevronRight: <path d="m9 5 7 7-7 7"/>,
  close: <><path d="M6 6l12 12M18 6 6 18"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  check: <path d="m5 12 4 4 10-10"/>,
  warning: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></>,
  file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/></>,
  external: <><path d="M14 5h5v5M19 5l-8 8"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/></>,
  refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18 9a7 7 0 0 0-12-2L4 11M6 15a7 7 0 0 0 12 2l2-4"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
};

export function Icon({ name, size = 18, strokeWidth = 1.8, className = "", ...props }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      {ICON_PATHS[name] || ICON_PATHS.info}
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconOnly = false,
  className = "",
  children,
  type = "button",
  ...props
}) {
  const classes = [
    "pmy-ds-button",
    `pmy-ds-button--${variant}`,
    size !== "md" ? `pmy-ds-button--${size}` : "",
    iconOnly ? "pmy-ds-button--icon" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {iconOnly ? null : children}
    </button>
  );
}

export function Card({
  as: Component = "section",
  compact = false,
  flush = false,
  interactive = false,
  className = "",
  children,
  ...props
}) {
  const classes = [
    "pmy-ds-card",
    compact ? "pmy-ds-card--compact" : "",
    flush ? "pmy-ds-card--flush" : "",
    interactive ? "pmy-ds-card--interactive" : "",
    className,
  ].filter(Boolean).join(" ");

  return <Component className={classes} {...props}>{children}</Component>;
}

export function Badge({ tone = "neutral", icon, className = "", children, ...props }) {
  const toneClass = tone === "neutral" ? "" : `pmy-ds-badge--${tone}`;
  return (
    <span className={["pmy-ds-badge", toneClass, className].filter(Boolean).join(" ")} {...props}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}

export function Tabs({ items = [], value, onChange, ariaLabel = "Tabs", className = "" }) {
  return (
    <div className={["pmy-ds-tabs", className].filter(Boolean).join(" ")} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={["pmy-ds-tab", active ? "is-active" : ""].filter(Boolean).join(" ")}
            onClick={() => onChange?.(item.value)}
            disabled={item.disabled}
          >
            {item.icon ? <Icon name={item.icon} size={14} /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  meta,
  className = "",
  ...props
}) {
  return (
    <label className={["pmy-ds-switch", className].filter(Boolean).join(" ")}>
      <input
        type="checkbox"
        className="pmy-ds-switch__input"
        checked={checked}
        onChange={(event) => onChange?.(event.target.checked, event)}
        {...props}
      />
      <span className="pmy-ds-switch__track" aria-hidden="true" />
      {label ? <span className="pmy-ds-switch__label">{label}</span> : null}
      {meta ? <span className="pmy-ds-switch__meta">{meta}</span> : null}
    </label>
  );
}

export function FormField({
  label,
  hint,
  error,
  required = false,
  className = "",
  children,
}) {
  return (
    <label className={["pmy-ds-form-field", className].filter(Boolean).join(" ")}>
      {label ? (
        <span className="pmy-ds-form-field__label">
          {label}{required ? " *" : ""}
        </span>
      ) : null}
      {children}
      {error ? <span className="pmy-ds-form-field__hint pmy-ds-form-field__error">{error}</span> : null}
      {!error && hint ? <span className="pmy-ds-form-field__hint">{hint}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...props }) {
  return <input className={["pmy-ds-input", className].filter(Boolean).join(" ")} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return <select className={["pmy-ds-input", className].filter(Boolean).join(" ")} {...props}>{children}</select>;
}

export function EmptyState({
  icon = "chart",
  title,
  description,
  compact = false,
  action = null,
  className = "",
}) {
  return (
    <div className={["pmy-ds-empty", compact ? "pmy-ds-empty--compact" : "", className].filter(Boolean).join(" ")} role="status">
      <div className="pmy-ds-empty__inner">
        <span className="pmy-ds-empty__icon"><Icon name={icon} size={compact ? 19 : 22} /></span>
        <strong className="pmy-ds-empty__title">{title}</strong>
        {description ? <span className="pmy-ds-empty__description">{description}</span> : null}
        {action ? <div className="pmy-ds-row" style={{ justifyContent: "center", marginTop: 14 }}>{action}</div> : null}
      </div>
    </div>
  );
}

export function Table({ children, className = "", ...props }) {
  return (
    <div className="pmy-ds-table-wrap">
      <table className={["pmy-ds-table", className].filter(Boolean).join(" ")} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  closeLabel = "Close",
  className = "",
}) {
  if (!open) return null;

  return (
    <div className="pmy-ds-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <div className={["pmy-ds-modal", className].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="pmy-ds-modal__header">
          <h2 className="pmy-ds-modal__title">{title}</h2>
          <Button variant="ghost" size="sm" icon="close" iconOnly aria-label={closeLabel} onClick={onClose} />
        </div>
        <div className="pmy-ds-modal__body">{children}</div>
        {footer ? <div className="pmy-ds-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Toast({ tone = "info", icon, children, className = "", ...props }) {
  const resolvedIcon = icon || (tone === "success" ? "check" : tone === "warning" || tone === "danger" ? "warning" : "info");
  return (
    <div className={["pmy-ds-toast", `pmy-ds-toast--${tone}`, className].filter(Boolean).join(" ")} role="status" {...props}>
      <Icon name={resolvedIcon} size={17} />
      <div>{children}</div>
    </div>
  );
}

export function SectionHeader({ eyebrow, title, subtitle, actions, className = "" }) {
  return (
    <div className={["pmy-ds-section-header", className].filter(Boolean).join(" ")}>
      <div>
        {eyebrow ? <div className="pmy-ds-eyebrow">{eyebrow}</div> : null}
        <h2 className="pmy-ds-title">{title}</h2>
        {subtitle ? <div className="pmy-ds-subtitle">{subtitle}</div> : null}
      </div>
      {actions ? <div className="pmy-ds-row pmy-ds-row--wrap">{actions}</div> : null}
    </div>
  );
}
