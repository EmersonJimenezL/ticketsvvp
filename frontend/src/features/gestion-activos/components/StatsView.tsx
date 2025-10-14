import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import type { LicenciaStats } from "../types";
import logoImg from "../../../assets/vivipra.png";

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const API_BASE = `${BASE_URL}/api`;

type StatsViewProps = {
  stats: {
    raw: LicenciaStats | null;
    porTipo: [string, number][];
    porProveedor: [string, number][];
    maxTipo: number;
    maxProveedor: number;
  };
};

const COLORS = [
  "#f97316",
  "#ea580c",
  "#fb923c",
  "#fdba74",
  "#fed7aa",
  "#ffedd5",
];

export function StatsView({ stats }: StatsViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState<"general" | "sap" | "office">(
    "general"
  );
  const [logoBase64, setLogoBase64] = useState<string>("");

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch(logoImg);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error cargando logo:", error);
      }
    };
    loadLogo();
  }, []);

  if (!stats.raw) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md text-neutral-300">
        Sin datos.
      </div>
    );
  }

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Obtener licencias detalladas
      const licenciasResponse = await fetch(
        `${API_BASE}/licencias?limit=500`
      );
      const licenciasData = await licenciasResponse.json();
      const todasLicencias = licenciasData.ok ? licenciasData.data : [];

      // Filtrar según tipo de reporte
      let licenciasFiltradas = todasLicencias;
      if (reportType === "sap") {
        licenciasFiltradas = todasLicencias.filter(
          (lic: any) => lic.proveedor === "SAP"
        );
      } else if (reportType === "office") {
        licenciasFiltradas = todasLicencias.filter(
          (lic: any) => lic.proveedor === "Office"
        );
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Función helper para agregar encabezado
      const addHeader = () => {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 18, pageWidth - margin, 18);

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("INFORME GENERAL - GESTIÓN DE LICENCIAS", margin, 15);

        // Agregar logo si está disponible
        if (logoBase64) {
          const logoSize = 15;
          pdf.addImage(
            logoBase64,
            "PNG",
            pageWidth - margin - logoSize,
            5,
            logoSize,
            logoSize
          );
        } else {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.text("VVP", pageWidth - margin, 15, { align: "right" });
        }

        pdf.setLineWidth(0.5);
        pdf.line(margin, 20, pageWidth - margin, 20);

        // RESETEAR fuente a normal después del header
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
      };

      const checkSpace = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - 18) {
          pdf.addPage();
          addHeader();
          y = 27;
          return true;
        }
        return false;
      };

      addHeader();
      y = 27;

      // Fecha
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const fecha = new Date();
      pdf.text(
        `Fecha: ${fecha.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}`,
        pageWidth - margin,
        y,
        { align: "right" }
      );
      y += 8;

      // Título del tipo de informe
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      let tituloInforme = "";
      if (reportType === "sap") {
        tituloInforme = "INFORME DE LICENCIAS SAP";
      } else if (reportType === "office") {
        tituloInforme = "INFORME DE LICENCIAS MICROSOFT OFFICE";
      } else {
        tituloInforme = "INFORME DE TODAS LAS LICENCIAS";
      }
      pdf.text(tituloInforme, pageWidth / 2, y, { align: "center" });
      y += 8;

      // RESUMEN GENERAL - TABLA PROFESIONAL
      const totalGeneral = todasLicencias.length;
      const sapTotal = todasLicencias.filter(
        (lic: any) => lic.proveedor === "SAP"
      ).length;
      const officeTotal = todasLicencias.filter(
        (lic: any) => lic.proveedor === "Office"
      ).length;
      const disponiblesGeneral = todasLicencias.filter(
        (lic: any) =>
          !lic.asignadoPara || lic.cuenta?.toLowerCase() === "disponible"
      ).length;
      const enUsoGeneral = totalGeneral - disponiblesGeneral;

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("RESUMEN GENERAL", margin, y);
      y += 6;

      // Tabla de resumen
      const resumenRowHeight = 6;
      const resumenCol1 = 80;
      const resumenCol2 = contentWidth - resumenCol1;

      // Encabezado tabla resumen
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.4);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y, resumenCol1, resumenRowHeight, "FD");
      pdf.rect(margin + resumenCol1, y, resumenCol2, resumenRowHeight, "FD");

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      pdf.text("Concepto", margin + 2, y + 4);
      pdf.text("Cantidad", margin + resumenCol1 + 2, y + 4);
      y += resumenRowHeight;

      // Filas de resumen
      const resumenData = [
        ["Total de licencias", totalGeneral.toString()],
        ["Licencias SAP", sapTotal.toString()],
        ["Licencias Microsoft Office", officeTotal.toString()],
        ["Licencias disponibles", disponiblesGeneral.toString()],
        ["Licencias en uso", enUsoGeneral.toString()],
      ];

      pdf.setFont("helvetica", "normal");
      resumenData.forEach((row) => {
        pdf.rect(margin, y, resumenCol1, resumenRowHeight);
        pdf.rect(margin + resumenCol1, y, resumenCol2, resumenRowHeight);
        pdf.text(row[0], margin + 2, y + 4);
        pdf.text(row[1], margin + resumenCol1 + 2, y + 4);
        y += resumenRowHeight;
      });

      y += 10;

      // Agrupar por tipo de licencia
      const licenciasPorTipo: Record<string, any[]> = {};
      licenciasFiltradas.forEach((lic: any) => {
        const tipo = lic.tipoLicencia || "Sin tipo";
        if (!licenciasPorTipo[tipo]) licenciasPorTipo[tipo] = [];
        licenciasPorTipo[tipo].push(lic);
      });

      // Ordenar tipos
      const tiposOrdenados = Object.entries(licenciasPorTipo).sort((a, b) =>
        a[0].localeCompare(b[0])
      );

      tiposOrdenados.forEach(([tipo, licencias]) => {
        checkSpace(25);

        // Título del tipo con diseño profesional
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `${tipo.toUpperCase()} (${licencias.length} licencias)`,
          margin,
          y
        );
        pdf.setFont("helvetica", "normal");
        y += 6;

        // Configuración tabla
        const rowHeight = 6;
        const col1Width = 50;
        const col2Width = 70;
        const col3Width = contentWidth - col1Width - col2Width;

        // Encabezado de tabla con fondo gris
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.4);
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, y, col1Width, rowHeight, "FD");
        pdf.rect(margin + col1Width, y, col2Width, rowHeight, "FD");
        pdf.rect(margin + col1Width + col2Width, y, col3Width, rowHeight, "FD");

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
        pdf.text("Cuenta", margin + 2, y + 4);
        pdf.text("Asignado a", margin + col1Width + 2, y + 4);
        pdf.text("Fecha", margin + col1Width + col2Width + 2, y + 4);

        y += rowHeight;

        // Filas de datos
        pdf.setFont("helvetica", "normal");
        licencias.forEach((lic: any) => {
          checkSpace(rowHeight + 3);

          const cuenta = lic.cuenta || "N/A";
          const asignado = lic.asignadoPara || "Sin asignar";
          const fechaAsig = lic.fechaAsignacion
            ? new Date(lic.fechaAsignacion).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "-";

          // Bordes de celda
          pdf.setLineWidth(0.3);
          pdf.rect(margin, y, col1Width, rowHeight);
          pdf.rect(margin + col1Width, y, col2Width, rowHeight);
          pdf.rect(margin + col1Width + col2Width, y, col3Width, rowHeight);

          // Contenido
          pdf.text(cuenta.substring(0, 32), margin + 2, y + 4);
          pdf.text(asignado.substring(0, 42), margin + col1Width + 2, y + 4);
          pdf.text(fechaAsig, margin + col1Width + col2Width + 2, y + 4);

          y += rowHeight;
        });

        y += 8;
      });

      // Pie de página
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        pdf.setFontSize(7);
        pdf.setTextColor(80, 80, 80);
        pdf.setFont("helvetica", "normal");
        pdf.text("VVP - Confidencial", margin, pageHeight - 8);
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin,
          pageHeight - 8,
          { align: "right" }
        );
      }

      const fechaArchivo = new Date().toISOString().split("T")[0];
      const nombreArchivo =
        reportType === "general"
          ? `Informe_General_Licencias_${fechaArchivo}.pdf`
          : reportType === "sap"
          ? `Informe_Licencias_SAP_${fechaArchivo}.pdf`
          : `Informe_Licencias_Office_${fechaArchivo}.pdf`;
      pdf.save(nombreArchivo);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el informe PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const porcentajeDisponibles =
    stats.raw.total > 0
      ? ((stats.raw.disponibles / stats.raw.total) * 100).toFixed(1)
      : "0";

  const porcentajeOcupadas =
    stats.raw.total > 0
      ? ((stats.raw.ocupadas / stats.raw.total) * 100).toFixed(1)
      : "0";

  const pieData = [
    { name: "Disponibles", value: stats.raw.disponibles },
    { name: "Ocupadas", value: stats.raw.ocupadas },
  ];

  const barDataTipo = stats.porTipo.map(([name, value]) => ({
    name: name.length > 20 ? name.substring(0, 20) + "..." : name,
    cantidad: value,
  }));

  const barDataProveedor = stats.porProveedor.map(([name, value]) => ({
    name,
    cantidad: value,
  }));

  return (
    <div className="space-y-6">
      {/* Selector de tipo de informe y botón de generar */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-neutral-300">
              Tipo de Informe:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            >
              <option value="general">General (Todas las licencias)</option>
              <option value="sap">Solo Licencias SAP</option>
              <option value="office">Solo Licencias Office</option>
            </select>
          </div>

          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold transition hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {isGenerating ? "Generando PDF..." : "Generar Informe PDF"}
          </button>
        </div>
      </div>

      {/* Contenido visual de las métricas */}
      <div className="space-y-6 bg-neutral-950 p-8">
        {/* Encabezado del informe */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Informe de Métricas
              </h1>
              <p className="text-lg text-neutral-300">
                Gestión de Activos y Licencias
              </p>
              <p className="text-sm text-neutral-400 mt-2">
                Fecha:{" "}
                {new Date().toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {logoBase64 ? (
              <img
                src={logoBase64}
                alt="VVP Logo"
                className="w-32 h-32 object-contain"
              />
            ) : (
              <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-2xl">
                <span className="text-4xl font-bold text-white">VVP</span>
              </div>
            )}
          </div>
        </div>

        {/* Resto del contenido visual... (se mantiene igual) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Total de Licencias"
            value={stats.raw.total}
            icon={
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            color="from-blue-500 to-blue-600"
            percentage=""
          />
          <StatCard
            label="Licencias Disponibles"
            value={stats.raw.disponibles}
            icon={
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="from-emerald-500 to-emerald-600"
            percentage={`${porcentajeDisponibles}% del total`}
          />
          <StatCard
            label="Licencias Ocupadas"
            value={stats.raw.ocupadas}
            icon={
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
            color="from-orange-500 to-orange-600"
            percentage={`${porcentajeOcupadas}% del total`}
          />
        </div>

        {/* Gráficos de distribución */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <h3 className="text-xl font-semibold text-white mb-6">
              Distribución de Uso
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f97316" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <h3 className="text-xl font-semibold text-white mb-6">
              Análisis de Capacidad
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-300">Tasa de Utilización</span>
                  <span className="text-2xl font-bold text-orange-500">
                    {porcentajeOcupadas}%
                  </span>
                </div>
                <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                    style={{ width: `${porcentajeOcupadas}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-300">Capacidad Disponible</span>
                  <span className="text-2xl font-bold text-emerald-500">
                    {porcentajeDisponibles}%
                  </span>
                </div>
                <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${porcentajeDisponibles}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="text-sm text-neutral-400">
                  <p className="mb-2">
                    <strong className="text-white">Recomendación:</strong>
                    {parseFloat(porcentajeOcupadas) > 80
                      ? " Se recomienda adquirir más licencias para mantener disponibilidad."
                      : " Nivel de utilización óptimo."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de barras - Licencias por Tipo */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Licencias por Tipo
            </h3>
            <span className="text-sm text-neutral-400">
              {stats.porTipo.length} tipos diferentes
            </span>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={barDataTipo}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="name"
                stroke="#a3a3a3"
                angle={-45}
                textAnchor="end"
                height={100}
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#a3a3a3" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="cantidad" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detalles por tipo (tabla) - SAP y Office separados */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <h3 className="text-xl font-semibold text-white mb-6">
            Detalle de Licencias por Tipo
          </h3>

          {/* Licencias SAP */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <h4 className="text-lg font-semibold text-white">
                Licencias SAP
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-neutral-300 font-semibold">
                      Tipo de Licencia
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-300 font-semibold">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-300 font-semibold">
                      % del Total
                    </th>
                    <th className="text-left py-3 px-4 text-neutral-300 font-semibold">
                      Representación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.porTipo
                    .filter(
                      ([tipo]) =>
                        tipo === "Profesional" ||
                        tipo === "CRM limitada" ||
                        tipo === "Logistica limitada" ||
                        tipo === "Acceso indirecto" ||
                        tipo === "Financiera limitada"
                    )
                    .map(([tipo, cantidad]) => {
                      const porcentaje =
                        stats.raw!.total > 0
                          ? ((cantidad / stats.raw!.total) * 100).toFixed(1)
                          : "0";
                      return (
                        <tr
                          key={tipo}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-4 text-neutral-100">{tipo}</td>
                          <td className="py-3 px-4 text-right text-white font-semibold">
                            {cantidad}
                          </td>
                          <td className="py-3 px-4 text-right text-neutral-300">
                            {porcentaje}%
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden max-w-xs">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${porcentaje}%`,
                                  backgroundColor: "#3b82f6",
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {stats.porTipo.filter(
                    ([tipo]) =>
                      tipo === "Profesional" ||
                      tipo === "CRM limitada" ||
                      tipo === "Logistica limitada" ||
                      tipo === "Acceso indirecto" ||
                      tipo === "Financiera limitada"
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 px-4 text-center text-neutral-400"
                      >
                        No hay licencias SAP registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Licencias Office */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <h4 className="text-lg font-semibold text-white">
                Licencias Microsoft Office
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-neutral-300 font-semibold">
                      Tipo de Licencia
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-300 font-semibold">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-300 font-semibold">
                      % del Total
                    </th>
                    <th className="text-left py-3 px-4 text-neutral-300 font-semibold">
                      Representación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.porTipo
                    .filter(
                      ([tipo]) =>
                        tipo.includes("Microsoft 365") ||
                        tipo.includes("Office")
                    )
                    .map(([tipo, cantidad]) => {
                      const porcentaje =
                        stats.raw!.total > 0
                          ? ((cantidad / stats.raw!.total) * 100).toFixed(1)
                          : "0";
                      return (
                        <tr
                          key={tipo}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-4 text-neutral-100">{tipo}</td>
                          <td className="py-3 px-4 text-right text-white font-semibold">
                            {cantidad}
                          </td>
                          <td className="py-3 px-4 text-right text-neutral-300">
                            {porcentaje}%
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden max-w-xs">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${porcentaje}%`,
                                  backgroundColor: "#10b981",
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {stats.porTipo.filter(
                    ([tipo]) =>
                      tipo.includes("Microsoft 365") || tipo.includes("Office")
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 px-4 text-center text-neutral-400"
                      >
                        No hay licencias Microsoft Office registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gráfico de barras - Licencias por Proveedor */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Licencias por Proveedor
            </h3>
            <span className="text-sm text-neutral-400">
              {stats.porProveedor.length} proveedores
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={barDataProveedor}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis dataKey="name" stroke="#a3a3a3" />
              <YAxis stroke="#a3a3a3" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="cantidad" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detalles por proveedor */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <h3 className="text-xl font-semibold text-white mb-6">
            Detalle de Licencias por Proveedor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.porProveedor.map(([proveedor, cantidad], index) => {
              const porcentaje =
                stats.raw!.total > 0
                  ? ((cantidad / stats.raw!.total) * 100).toFixed(1)
                  : "0";
              return (
                <div
                  key={proveedor}
                  className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white text-lg">
                      {proveedor}
                    </h4>
                    <span className="text-2xl font-bold text-orange-500">
                      {cantidad}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-neutral-300">
                      <span>Porcentaje del total</span>
                      <span className="font-semibold">{porcentaje}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${porcentaje}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen final */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-orange-600/10 p-6 backdrop-blur-md">
          <h3 className="text-xl font-semibold text-white mb-4">
            Resumen Ejecutivo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-neutral-200">
            <div>
              <h4 className="font-semibold text-white mb-2">
                Inventario Total
              </h4>
              <ul className="space-y-1 text-sm">
                <li>
                  • Total de licencias:{" "}
                  <strong className="text-white">{stats.raw.total}</strong>
                </li>
                <li>
                  • Licencias disponibles:{" "}
                  <strong className="text-emerald-400">
                    {stats.raw.disponibles}
                  </strong>
                </li>
                <li>
                  • Licencias en uso:{" "}
                  <strong className="text-orange-400">
                    {stats.raw.ocupadas}
                  </strong>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Distribución</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  • Tipos de licencias:{" "}
                  <strong className="text-white">{stats.porTipo.length}</strong>
                </li>
                <li>
                  • Proveedores activos:{" "}
                  <strong className="text-white">
                    {stats.porProveedor.length}
                  </strong>
                </li>
                <li>
                  • Tipo más común:{" "}
                  <strong className="text-white">
                    {stats.porTipo[0]?.[0] || "N/A"}
                  </strong>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pie de página del informe */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
          <p className="text-sm text-neutral-400">
            Este informe fue generado automáticamente el{" "}
            {new Date().toLocaleString("es-ES")}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Sistema de Gestión de Activos y Licencias - VVP
          </p>
        </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  percentage: string;
};

function StatCard({ label, value, icon, color, percentage }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md hover:scale-105 transition-transform duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white">{value}</div>
        </div>
      </div>
      <div className="text-sm font-medium text-neutral-300 mb-1">{label}</div>
      {percentage && (
        <div className="text-xs text-neutral-400">{percentage}</div>
      )}
    </div>
  );
}
