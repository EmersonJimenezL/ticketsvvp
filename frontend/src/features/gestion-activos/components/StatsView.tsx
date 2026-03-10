import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { LicenciaStats } from "../types";
import logoImg from "../../../assets/vivipra.png";
import { loadJsPdf } from "../../../utils/loadJsPdf";
import {
  getCuentaArea,
  getCuentaAssignedDisplay,
  getCuentaCentroCosto,
  getCuentaDisplay,
  getCuentaSucursal,
  isCuentaDisponible,
} from "../utils/licenciaCuenta";

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
          (lic: any) => String(lic.proveedor || "").toUpperCase() === "OFFICE"
        );
      }

      const JsPDF = await loadJsPdf();
      const pdf = new JsPDF("p", "mm", "a4");
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

      // RESUMEN DEL REPORTE (según selección)
      const totalSeleccionado = licenciasFiltradas.length;
      const sapTotalSeleccionado = licenciasFiltradas.filter(
        (lic: any) => lic.proveedor === "SAP"
      ).length;
      const officeTotalSeleccionado = licenciasFiltradas.filter(
        (lic: any) => String(lic.proveedor || "").toUpperCase() === "OFFICE"
      ).length;
      const disponiblesSeleccionadas = licenciasFiltradas.filter(
        (lic: any) => {
          const asignado =
            lic.asignadoPara || getCuentaAssignedDisplay(lic.cuenta);
          return !asignado || isCuentaDisponible(lic.cuenta);
        }
      ).length;
      const enUsoSeleccionadas = totalSeleccionado - disponiblesSeleccionadas;

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        reportType === "general" ? "RESUMEN GENERAL" : "RESUMEN DEL REPORTE",
        margin,
        y
      );
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
      const resumenData: [string, string][] = [
        ["Total de licencias", totalSeleccionado.toString()],
      ];
      if (reportType === "general" || reportType === "sap") {
        resumenData.push(["Licencias SAP", sapTotalSeleccionado.toString()]);
      }
      if (reportType === "general" || reportType === "office") {
        resumenData.push([
          "Licencias Microsoft Office",
          officeTotalSeleccionado.toString(),
        ]);
      }
      resumenData.push(
        ["Licencias disponibles", disponiblesSeleccionadas.toString()],
        ["Licencias en uso", enUsoSeleccionadas.toString()]
      );

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
        const tableFontSize = 7;
        const columns = [
          { label: "Cuenta", width: 32 },
          { label: "Asignado a", width: 34 },
          { label: "Sucursal", width: 30 },
          { label: "Gerencia", width: 30 },
          { label: "Centro Costo", width: 30 },
          { label: "Fecha", width: contentWidth - 156 },
        ] as const;

        const fitText = (value: string, maxWidth: number) => {
          const input = (value || "-").toString();
          if (pdf.getTextWidth(input) <= maxWidth) return input;

          let current = input;
          while (
            current.length > 0 &&
            pdf.getTextWidth(`${current}...`) > maxWidth
          ) {
            current = current.slice(0, -1);
          }
          return current ? `${current}...` : "-";
        };

        // Encabezado de tabla con fondo gris
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.4);
        pdf.setFillColor(240, 240, 240);

        let headerX = margin;
        columns.forEach((column) => {
          pdf.rect(headerX, y, column.width, rowHeight, "FD");
          headerX += column.width;
        });

        pdf.setFontSize(tableFontSize);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);

        headerX = margin;
        columns.forEach((column) => {
          pdf.text(column.label, headerX + 1.5, y + 4);
          headerX += column.width;
        });

        y += rowHeight;

        // Filas de datos
        pdf.setFont("helvetica", "normal");
        licencias.forEach((lic: any) => {
          checkSpace(rowHeight + 3);

          const cuenta = getCuentaDisplay(lic.cuenta) || "N/A";
          const asignado =
            lic.asignadoPara ||
            getCuentaAssignedDisplay(lic.cuenta) ||
            "Sin asignar";
          const sucursal =
            lic.sucursal || getCuentaSucursal(lic.cuenta) || "-";
          const gerencia = lic.area || getCuentaArea(lic.cuenta) || "-";
          const centroCosto =
            lic.centroCosto || getCuentaCentroCosto(lic.cuenta) || "-";
          const fechaAsig = lic.fechaAsignacion
            ? new Date(lic.fechaAsignacion).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "-";
          const rowValues = [
            cuenta,
            asignado,
            sucursal,
            gerencia,
            centroCosto,
            fechaAsig,
          ];

          // Bordes de celda
          pdf.setLineWidth(0.3);

          let rowX = margin;
          columns.forEach((column, index) => {
            pdf.rect(rowX, y, column.width, rowHeight);
            pdf.text(fitText(rowValues[index] || "-", column.width - 3), rowX + 1.5, y + 4);
            rowX += column.width;
          });

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

  // Separar licencias SAP y Office
  const sapLicencias = stats.porTipo.filter(
    ([tipo]) =>
      tipo === "Profesional" ||
      tipo === "CRM limitada" ||
      tipo === "Logistica limitada" ||
      tipo === "Acceso indirecto" ||
      tipo === "Financiera limitada"
  );

  const officeLicencias = stats.porTipo.filter(
    ([tipo]) =>
      tipo.includes("Microsoft 365") ||
      tipo.includes("Office")
  );

  const barDataProveedor = stats.porProveedor.map(([name, value]) => ({
    name,
    cantidad: value,
  }));

  const totalLicencias = stats.raw.total || 0;
  const disponibles = stats.raw.disponibles || 0;
  const ocupadas = stats.raw.ocupadas || Math.max(totalLicencias - disponibles, 0);
  const sapTotal = sapLicencias.reduce((acc, [, cantidad]) => acc + cantidad, 0);
  const officeTotal = officeLicencias.reduce((acc, [, cantidad]) => acc + cantidad, 0);
  const disponibilidadPct =
    totalLicencias > 0 ? Math.round((disponibles / totalLicencias) * 100) : 0;
  const usoPct = totalLicencias > 0 ? Math.round((ocupadas / totalLicencias) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Selector de tipo de informe y botón de generar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-neutral-700">
              Tipo de Informe:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-orange-500"
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
      <div className="space-y-6">
        {/* Encabezado del informe */}
        <div className="rounded-2xl border border-neutral-200 bg-gradient-to-r from-neutral-50 via-orange-50/60 to-white p-6 shadow-[0_12px_35px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-1">
                Informe de Métricas
              </h1>
              <p className="text-base text-neutral-700">
                Gestión de Activos y Licencias
              </p>
              <p className="text-sm text-neutral-500 mt-1">
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
                className="h-20 w-20 rounded-xl border border-neutral-200 bg-white object-contain p-2 shadow-sm"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-xl">
                <span className="text-2xl font-bold text-white">VVP</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Total licencias
            </p>
            <p className="mt-2 text-3xl font-bold text-neutral-900">{totalLicencias}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Disponibles
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">{disponibles}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              En uso
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-800">{ocupadas}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Licencias SAP
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-800">{sapTotal}</p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Licencias Office
            </p>
            <p className="mt-2 text-3xl font-bold text-cyan-800">{officeTotal}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_10px_28px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-neutral-900">Resumen de licencias</h3>
            <span className="text-sm text-neutral-500">
              Disponibilidad {disponibilidadPct}% | En uso {usoPct}%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium text-neutral-700">Licencias disponibles</p>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${disponibilidadPct}%` }}
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-neutral-700">Licencias en uso</p>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${usoPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detalles por tipo (tabla) - SAP y Office separados */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.05)]">
          <h3 className="text-xl font-semibold text-neutral-900 mb-6">
            Detalle de Licencias por Tipo
          </h3>

          {/* Licencias SAP */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <h4 className="text-lg font-semibold text-blue-800">
                Licencias SAP
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left py-3 px-4 text-neutral-700 font-semibold">
                      Tipo de Licencia
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-700 font-semibold">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-700 font-semibold">
                      % del Total
                    </th>
                    <th className="text-left py-3 px-4 text-neutral-700 font-semibold">
                      Representación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sapLicencias.map(([tipo, cantidad]) => {
                    const porcentaje =
                      stats.raw!.total > 0
                        ? ((cantidad / stats.raw!.total) * 100).toFixed(1)
                        : "0";
                    return (
                      <tr
                        key={tipo}
                        className="border-b border-neutral-100 hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-neutral-800">{tipo}</td>
                        <td className="py-3 px-4 text-right text-neutral-900 font-semibold">
                          {cantidad}
                        </td>
                        <td className="py-3 px-4 text-right text-neutral-600">
                          {porcentaje}%
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-2 rounded-full bg-neutral-200 overflow-hidden max-w-xs">
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
                  {sapLicencias.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 px-4 text-center text-neutral-500"
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
              <h4 className="text-lg font-semibold text-emerald-800">
                Licencias Microsoft Office
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left py-3 px-4 text-neutral-700 font-semibold">
                      Tipo de Licencia
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-700 font-semibold">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-700 font-semibold">
                      % del Total
                    </th>
                    <th className="text-left py-3 px-4 text-neutral-700 font-semibold">
                      Representación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {officeLicencias.map(([tipo, cantidad]) => {
                    const porcentaje =
                      stats.raw!.total > 0
                        ? ((cantidad / stats.raw!.total) * 100).toFixed(1)
                        : "0";
                    return (
                      <tr
                        key={tipo}
                        className="border-b border-neutral-100 hover:bg-emerald-50/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-neutral-800">{tipo}</td>
                        <td className="py-3 px-4 text-right text-neutral-900 font-semibold">
                          {cantidad}
                        </td>
                        <td className="py-3 px-4 text-right text-neutral-600">
                          {porcentaje}%
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-2 rounded-full bg-neutral-200 overflow-hidden max-w-xs">
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
                  {officeLicencias.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 px-4 text-center text-neutral-500"
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
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-neutral-900">
              Licencias por Proveedor
            </h3>
            <span className="text-sm text-neutral-500">
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
                stroke="rgba(17,24,39,0.12)"
              />
              <XAxis dataKey="name" stroke="#4b5563" />
              <YAxis stroke="#4b5563" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  color: "#111827",
                }}
              />
              <Legend />
              <Bar dataKey="cantidad" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
