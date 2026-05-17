import React from "react";

export default function FormSection({
  title,
  subtitle,
  onSubmit,
  children,
  submitLabel = "Submit",
  loading = false,
}) {
  return (
    <form onSubmit={onSubmit} className="form-section-template">
      <div className="form-header">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="form-body">{children}</div>
      <button type="submit" className="btn primary" disabled={loading}>
        {loading ? "Processing..." : submitLabel}
      </button>
    </form>
  );
}
