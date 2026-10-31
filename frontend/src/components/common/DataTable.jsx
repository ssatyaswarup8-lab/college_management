import EmptyState from './EmptyState.jsx'

export default function DataTable({
  columns = [],
  rows = [],
  getRowKey = (row, index) => row.id ?? index,
  onRowClick,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records to show right now.',
  caption,
  className = '',
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] ${className}`.trim()}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`whitespace-nowrap px-5 py-4 font-semibold ${column.headerClassName ?? ''}`} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={onRowClick ? 'cursor-pointer transition hover:bg-slate-50 focus-within:bg-slate-50' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onRowClick(row)
                  }
                } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-5 py-4 align-middle text-slate-700 ${column.className ?? ''}`}>
                    {column.render ? column.render(row[column.key], row, index) : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
