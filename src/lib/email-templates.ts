export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailRows(rows: Array<[string, string]>): string {
  const body = rows
    .filter(([, value]) => value.trim().length > 0)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#0f172a;font-size:14px;white-space:pre-wrap;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `<table style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">${body}</table>`;
}
