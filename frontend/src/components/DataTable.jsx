import React from "react";

export default function DataTable({
  columns = [],
  rows = [],
  onRowClick,
  className = "",
}) {
  return (
    <div className={`data-table-wrapper ${className}`}>
      <table className="data-table-template">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={col.align ? `align-${col.align}` : ""}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick && onRowClick(row)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && onRowClick) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              tabIndex={onRowClick ? 0 : -1}
              className="data-row-hover"
            >
              {columns.map((col, cidx) => (
                <td
                  key={cidx}
                  className={col.align ? `align-${col.align}` : ""}
                >
                  {typeof row[col.key] === "object"
                    ? JSON.stringify(row[col.key])
                    : row[col.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="table-empty-state">
          <p>No data available</p>
        </div>
      )}
    </div>
  );
}
