import type { LicenciaStats } from "../types";

type StatsViewProps = {
  stats: {
    raw: LicenciaStats | null;
    porTipo: [string, number][];
    porProveedor: [string, number][];
    maxTipo: number;
    maxProveedor: number;
  };
};

export function StatsView({ stats }: StatsViewProps) {
  if (!stats.raw) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md text-neutral-300">
        Sin datos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total licencias" value={stats.raw.total} />
        <StatCard
          label="Disponibles"
          value={stats.raw.disponibles}
          color="bg-emerald-500"
        />
        <StatCard
          label="Ocupadas"
          value={stats.raw.ocupadas}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListStat
          title="Por tipo"
          data={stats.porTipo}
          maxValue={stats.maxTipo}
          barClassName="bg-orange-500"
        />
        <ListStat
          title="Por proveedor"
          data={stats.porProveedor}
          maxValue={stats.maxProveedor}
          barClassName="bg-emerald-500"
        />
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  color?: string;
};

function StatCard({ label, value, color = "bg-white/10" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="text-sm text-neutral-300">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className={`mt-3 h-1.5 rounded-full ${color}`} />
    </div>
  );
}

type ListStatProps = {
  title: string;
  data: [string, number][];
  maxValue: number;
  barClassName: string;
};

function ListStat({ title, data, maxValue, barClassName }: ListStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-3 space-y-3">
        {data.length === 0 ? (
          <li className="text-sm text-neutral-300">Sin datos.</li>
        ) : (
          data.map(([label, count]) => (
            <li key={label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{label}</span>
                <span className="font-semibold">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barClassName}`}
                  style={{
                    width: `${
                      maxValue ? Math.max((count / maxValue) * 100, 8) : 100
                    }%`,
                  }}
                />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
