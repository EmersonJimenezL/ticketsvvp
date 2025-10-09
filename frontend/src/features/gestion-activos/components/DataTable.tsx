import { ReactNode } from "react";

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
};

export function DataTable<T>({
  columns,
  data,
  actions,
  keyExtractor,
  emptyMessage = "No hay datos para mostrar",
  loading = false,
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
    <table className="min-w-full text-sm">
      <thead className="bg-black sticky top-0 z-10 backdrop-blur">
        <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-sm font-medium text-neutral-300 ${
                  col.className || ""
                }`}
              >
                {col.label}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-4 py-3 text-right text-sm font-medium text-neutral-300">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm text-neutral-200 ${col.className || ""}`}
                >
                  {col.render(item)}
                </td>
              ))}
              {actions && actions.length > 0 && (
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    {actions.map((action, idx) => {
                      const isDisabled = action.disabled ? action.disabled(item) : false;
                      return (
                        <button
                          key={idx}
                          onClick={() => !isDisabled && action.onClick(item)}
                          disabled={isDisabled}
                          className={action.className || "px-3 py-1 rounded-lg text-sm transition bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"}
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
  );
}
