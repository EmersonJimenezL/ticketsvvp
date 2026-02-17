import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  className?: string;
};

export type Action<T> = {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  className?: string;
  disabled?: (item: T) => boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  actions?: Action<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
};

export function DataTable<T>({
  columns,
  data,
  actions,
  keyExtractor,
  emptyMessage = "No hay datos para mostrar",
  loading = false,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-neutral-400">Cargando...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-neutral-400">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 p-3 md:hidden">
        {data.map((item) => (
          <article
            key={keyExtractor(item)}
            className={`rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition-colors ${
              onRowClick ? "cursor-pointer hover:bg-orange-50/40" : ""
            }`}
            onClick={onRowClick ? () => onRowClick(item) : undefined}
            onKeyDown={
              onRowClick
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(item);
                    }
                  }
                : undefined
            }
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
          >
            <div className="space-y-2">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="grid grid-cols-1 gap-1 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-3"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    {col.label}
                  </span>
                  <div className="min-w-0 break-words text-sm text-neutral-800">
                    {col.render(item)}
                  </div>
                </div>
              ))}
            </div>

            {actions && actions.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3">
                {actions.map((action, idx) => {
                  const isDisabled = action.disabled ? action.disabled(item) : false;
                  return (
                    <button
                      key={idx}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!isDisabled) {
                          action.onClick(item);
                        }
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      disabled={isDisabled}
                      className={
                        action.className ||
                        "rounded-lg bg-white/5 px-3 py-1 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      }
                      aria-label={action.label}
                      title={action.label}
                    >
                      {action.icon || action.label}
                    </button>
                  );
                })}
              </div>
            )}
          </article>
        ))}
      </div>

      <table className="hidden min-w-full text-sm text-neutral-900 md:table">
        <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-sm font-semibold text-neutral-600 ${
                  col.className || ""
                }`}
              >
                {col.label}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className={`border-t border-neutral-200 odd:bg-neutral-50/60 transition-colors hover:bg-orange-50/40 ${
                onRowClick ? "cursor-pointer" : ""
              }`}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(item);
                      }
                    }
                  : undefined
              }
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm text-neutral-800 ${col.className || ""}`}
                >
                  {col.render(item)}
                </td>
              ))}
              {actions && actions.length > 0 && (
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {actions.map((action, idx) => {
                      const isDisabled = action.disabled ? action.disabled(item) : false;
                      return (
                        <button
                          key={idx}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isDisabled) {
                              action.onClick(item);
                            }
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          disabled={isDisabled}
                          className={
                            action.className ||
                            "rounded-lg bg-white/5 px-3 py-1 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                          }
                          aria-label={action.label}
                          title={action.label}
                        >
                          {action.icon || action.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
