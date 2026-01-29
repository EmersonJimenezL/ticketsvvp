import jsPDF from "jspdf";
import logoImg from "../../../assets/vivipra.png";
import { OPCIONES_TIPO_LIC_MAP } from "../constants";
import type { Activo, Especificacion } from "../types";

type ActaPdfInput = {
  numeroActa: string;
  fecha: Date;
  asignadoPara: string;
  asignadoPor?: string;
  rut?: string;
  correo?: string;
  activo: Activo;
  spec?: Especificacion;
  accesorios?: string;
  licenciaOffice?: string;
  officeLicencias?: Record<string, boolean>;
  sapCuenta?: Record<string, boolean>;
  sapBo?: Record<string, boolean>;
};

const THEME = {
  dark: [32, 32, 32] as const,
  mid: [60, 60, 60] as const,
  light: [245, 245, 245] as const,
  border: [200, 200, 200] as const,
  accent: [233, 120, 40] as const,
  text: [20, 20, 20] as const,
};

type LogoData = {
  dataUrl: string;
  width: number;
  height: number;
};

let cachedLogo: LogoData | null = null;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el logo"));
    reader.readAsDataURL(blob);
  });
}

async function getLogoData() {
  if (cachedLogo !== null) return cachedLogo;
  try {
    const response = await fetch(logoImg);
    if (!response.ok) {
      cachedLogo = null;
      return cachedLogo;
    }
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);

    const image = new Image();
    const imageLoaded = new Promise<LogoData>((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ dataUrl, width: image.width, height: image.height });
          return;
        }
        ctx.drawImage(image, 0, 0);
        const imgData = ctx.getImageData(0, 0, image.width, image.height).data;

        let minX = image.width;
        let minY = image.height;
        let maxX = 0;
        let maxY = 0;
        let found = false;

        for (let y = 0; y < image.height; y += 2) {
          for (let x = 0; x < image.width; x += 2) {
            const idx = (y * image.width + x) * 4;
            const alpha = imgData[idx + 3];
            if (alpha > 10) {
              found = true;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!found) {
          resolve({ dataUrl, width: image.width, height: image.height });
          return;
        }

        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropWidth;
        cropCanvas.height = cropHeight;
        const cropCtx = cropCanvas.getContext("2d");
        if (!cropCtx) {
          resolve({ dataUrl, width: image.width, height: image.height });
          return;
        }
        cropCtx.drawImage(
          image,
          minX,
          minY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );
        resolve({
          dataUrl: cropCanvas.toDataURL("image/png"),
          width: cropWidth,
          height: cropHeight,
        });
      };
      image.onerror = () => reject(new Error("No se pudo cargar el logo"));
    });

    image.src = dataUrl;
    cachedLogo = await imageLoaded;
    return cachedLogo;
  } catch {
    cachedLogo = null;
    return cachedLogo;
  }
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateCompact(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDateLongEs(date: Date) {
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const day = pad2(date.getDate());
  const month = meses[date.getMonth()] || "";
  return `${day} de ${month} de ${date.getFullYear()}`;
}

function safeText(value?: string | null) {
  return value && value.trim() !== "" ? value : "-";
}

function fitText(pdf: jsPDF, text: string, maxWidth: number) {
  const ellipsis = "...";
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  let trimmed = text;
  while (
    trimmed.length > 0 &&
    pdf.getTextWidth(trimmed + ellipsis) > maxWidth
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length ? trimmed + ellipsis : ellipsis;
}

function joinParts(...parts: Array<string | undefined>) {
  return parts.filter((part) => part && part.trim() !== "").join(" ");
}

function drawRow({
  pdf,
  x,
  y,
  rowHeight,
  widths,
  label,
  value,
  rightLabel,
  rightValue,
}: {
  pdf: jsPDF;
  x: number;
  y: number;
  rowHeight: number;
  widths: [number, number, number, number];
  label: string;
  value: string;
  rightLabel?: string;
  rightValue?: string;
}) {
  const [labelW, valueW, rLabelW, rValueW] = widths;
  const labelText = label || "";
  const valueText = value || "";
  const rightLabelText = rightLabel || "";
  const rightValueText = rightValue || "";

  pdf.setDrawColor(...THEME.border);
  pdf.setLineWidth(0.2);

  pdf.setFillColor(...THEME.light);
  pdf.rect(x, y, labelW, rowHeight, "FD");
  pdf.rect(x + labelW + valueW, y, rLabelW, rowHeight, "FD");

  pdf.setFillColor(255, 255, 255);
  pdf.rect(x + labelW, y, valueW, rowHeight, "FD");
  pdf.rect(x + labelW + valueW + rLabelW, y, rValueW, rowHeight, "FD");

  pdf.setTextColor(...THEME.text);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text(fitText(pdf, labelText, labelW - 4), x + 2, y + rowHeight * 0.65);
  pdf.text(
    fitText(pdf, rightLabelText, rLabelW - 4),
    x + labelW + valueW + 2,
    y + rowHeight * 0.65,
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text(
    fitText(pdf, valueText, valueW - 4),
    x + labelW + 2,
    y + rowHeight * 0.65,
  );
  pdf.text(
    fitText(pdf, rightValueText, rValueW - 4),
    x + labelW + valueW + rLabelW + 2,
    y + rowHeight * 0.65,
  );
}

function drawCheckbox(pdf: jsPDF, x: number, y: number, checked: boolean) {
  const size = 4;
  pdf.setDrawColor(...THEME.border);
  pdf.rect(x, y, size, size);
  if (checked) {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.6);
    pdf.line(x + 0.7, y + 2, x + 1.8, y + 3.2);
    pdf.line(x + 1.8, y + 3.2, x + 3.3, y + 0.7);
  }
}

export async function generateActaEntregaPdf(input: ActaPdfInput) {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = 12;

  const logoData = await getLogoData();

  pdf.setFillColor(...THEME.dark);
  pdf.rect(0, 0, pageWidth, 10, "F");

  const logoWidth = 70;
  let logoHeight = 22;
  const logoY = 12;

  if (logoData) {
    const ratio = logoData.width > 0 ? logoData.height / logoData.width : 0.25;
    logoHeight = Math.min(24, Math.max(14, logoWidth * ratio));
    pdf.addImage(logoData.dataUrl, "PNG", margin, logoY, logoWidth, logoHeight);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("VIVIPRA", margin, logoY + 11);
  }

  const badgeWidth = 58;
  const badgeHeight = 10;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = logoY + (logoHeight - badgeHeight) / 2;
  pdf.setFillColor(...THEME.mid);
  pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.4, 1.4, "F");
  const numeroActaValue =
    input.numeroActa && input.numeroActa.trim() !== ""
      ? input.numeroActa.trim()
      : "S/C";
  const badgeText = numeroActaValue.startsWith("ACTA-")
    ? numeroActaValue
    : `Acta N° ${numeroActaValue}`;
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(badgeText, badgeX + badgeWidth - 2, badgeY + 6.5, {
    align: "right",
  });

  y = logoY + logoHeight + 4;

  pdf.setDrawColor(...THEME.accent);
  pdf.setLineWidth(0.6);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;

  pdf.setFillColor(...THEME.mid);
  const titleHeight = 14;
  pdf.rect(margin, y, pageWidth - margin * 2, titleHeight, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  const titleLines = [
    "SOLICITUD, HABILITACION Y ENTREGA DE",
    "EQUIPOS Y DE CUENTAS CORPORATIVAS",
  ];
  pdf.text(titleLines, pageWidth / 2, y + 5.5, { align: "center" });
  y += titleHeight + 6;

  const fechaTexto = formatDateLongEs(input.fecha);
  const parrafo =
    `Hoy, ${fechaTexto} en las oficinas de VIVIPRA SpA, ` +
    "mediante el presente documento se realiza la entrega formal de " +
    "equipamiento de prestamo y a su cargo.";

  pdf.setTextColor(...THEME.text);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  const textoLines = pdf.splitTextToSize(parrafo, pageWidth - margin * 2);
  pdf.text(textoLines, margin, y);
  y += textoLines.length * 5 + 4;

  pdf.setFillColor(...THEME.mid);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
  pdf.text("DATOS DEL EQUIPO ENTREGADO", margin + 4, y + 5.5);
  y += 10;

  const spec = input.spec;
  const modelo = safeText(input.activo.modelo);
  const marca = safeText(input.activo.marca);
  const tipo = safeText(input.activo.categoria);
  const accesorios = safeText(input.accesorios ?? input.activo.detalles);
  const procesador = safeText(joinParts(spec?.procesador, spec?.frecuenciaGhz));
  const ram = safeText(spec?.ram);
  const almacenamiento = safeText(spec?.almacenamiento);
  const so = safeText(spec?.so);
  const serie = safeText(input.activo.numeroSerie);
  const licenciaOffice = safeText(input.licenciaOffice);

  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const rowHeight = 7;
  const widths: [number, number, number, number] = [
    26,
    64,
    22,
    tableWidth - 26 - 64 - 22,
  ];

  const rows = [
    {
      label: "Nombre:",
      value: safeText(input.asignadoPara),
      rightLabel: "Tipo:",
      rightValue: tipo,
    },
    {
      label: "Marca:",
      value: marca,
      rightLabel: "Accesorios:",
      rightValue: accesorios,
    },
    {
      label: "Modelo:",
      value: modelo,
      rightLabel: "Serie:",
      rightValue: serie,
    },
    {
      label: "Procesador:",
      value: procesador,
      rightLabel: "Ram:",
      rightValue: ram,
    },
    {
      label: "HDD:",
      value: almacenamiento,
      rightLabel: "OS:",
      rightValue: so,
    },
  ];

  rows.forEach((row) => {
    drawRow({
      pdf,
      x: tableX,
      y,
      rowHeight,
      widths,
      label: row.label,
      value: row.value,
      rightLabel: row.rightLabel,
      rightValue: row.rightValue,
    });
    y += rowHeight;
  });

  y += 8;

  pdf.setFillColor(...THEME.mid);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
  pdf.text("HABILITACION DE CUENTAS CORPORATIVAS", margin + 4, y + 5.5);
  y += 11;

  pdf.setTextColor(...THEME.text);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const correo = safeText(input.correo);
  const correoLabel = "Habilitacion de Correo electronico:";
  pdf.text(correoLabel, margin + 2, y);
  pdf.setTextColor(20, 70, 160);
  const correoX = margin + 70;
  pdf.text(correo, correoX, y);
  pdf.setTextColor(...THEME.text);

  y += 6;

  const officeChecks: Record<string, boolean> = {
    ...(input.officeLicencias || {}),
  };
  if (
    input.licenciaOffice &&
    input.licenciaOffice.trim() !== "" &&
    input.licenciaOffice !== "-"
  ) {
    if (officeChecks[input.licenciaOffice] === undefined) {
      officeChecks[input.licenciaOffice] = true;
    }
  }

  const officeTipos = [...OPCIONES_TIPO_LIC_MAP.Office];
  const officeLabel = "Licencias Office:";
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);

  let officeLineY = y;
  pdf.text(officeLabel, margin + 2, officeLineY);
  let officeX = margin + 2 + pdf.getTextWidth(officeLabel) + 4;

  officeTipos.forEach((tipoOffice) => {
    const labelWidth = pdf.getTextWidth(tipoOffice);
    if (officeX + 4 + 2 + labelWidth > pageWidth - margin) {
      officeLineY += 6;
      officeX = margin + 2;
    }
    drawCheckbox(pdf, officeX, officeLineY - 3, Boolean(officeChecks[tipoOffice]));
    pdf.text(tipoOffice, officeX + 6, officeLineY);
    officeX += 6 + labelWidth + 6;
  });

  y = officeLineY + 6;

  const sapTableWidth = pageWidth - margin * 2;
  const leftX = margin;
  const headerHeight = 6;
  const sapRowHeight = 6;
  const sapLabelWidth = sapTableWidth - 16;

  pdf.setFillColor(...THEME.light);
  pdf.rect(leftX, y, sapTableWidth, headerHeight, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("Habilitacion cuenta usuario SAP:", leftX + 2, y + 4);

  y += headerHeight;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setDrawColor(...THEME.border);
  pdf.rect(leftX, y, sapLabelWidth, sapRowHeight, "D");
  pdf.rect(leftX + sapLabelWidth, y, 8, sapRowHeight, "D");
  pdf.rect(leftX + sapLabelWidth + 8, y, 8, sapRowHeight, "D");
  pdf.text("SI", leftX + sapLabelWidth + 2, y + 4);
  pdf.text("NO", leftX + sapLabelWidth + 10, y + 4);
  y += sapRowHeight;

  const sapCuenta = input.sapCuenta || {};
  const sapTipos = [...OPCIONES_TIPO_LIC_MAP.SAP];

  sapTipos.forEach((tipoSap) => {
    pdf.setDrawColor(...THEME.border);
    pdf.rect(leftX, y, sapLabelWidth, sapRowHeight);
    pdf.rect(leftX + sapLabelWidth, y, 8, sapRowHeight);
    pdf.rect(leftX + sapLabelWidth + 8, y, 8, sapRowHeight);

    pdf.text(tipoSap, leftX + 2, y + 4);

    const habilitada = Boolean(sapCuenta[tipoSap]);
    drawCheckbox(pdf, leftX + sapLabelWidth + 2, y + 1.2, habilitada);
    drawCheckbox(
      pdf,
      leftX + sapLabelWidth + 10,
      y + 1.2,
      !habilitada && sapCuenta[tipoSap] !== undefined,
    );

    y += sapRowHeight;
  });

  const observacionesRaw = input.activo.detalles || "";
  const observaciones =
    observacionesRaw && observacionesRaw.trim() !== ""
      ? observacionesRaw.trim()
      : "-";

  y += 6;

  const obsWidth = pageWidth - margin * 2;
  const obsPadding = 4;
  const obsLines = pdf.splitTextToSize(observaciones, obsWidth - obsPadding * 2);
  const obsTextHeight = obsLines.length * 4.2;
  const obsHeight = Math.max(12, obsTextHeight + 6);

  pdf.setDrawColor(...THEME.border);
  pdf.rect(margin, y, obsWidth, obsHeight);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...THEME.text);
  pdf.text("Observaciones:", margin + obsPadding, y + 5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text(obsLines, margin + obsPadding, y + 10);

  y += obsHeight + 6;

  const extraHeight = 16;
  pdf.setDrawColor(...THEME.border);
  pdf.rect(margin, y, obsWidth, extraHeight);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("Observaciones adicionales:", margin + obsPadding, y + 5);
  y += extraHeight + 6;

  y += 6;

  const signatureY = Math.max(y + 10, pageHeight - 42);
  pdf.setDrawColor(...THEME.border);
  pdf.setLineWidth(0.4);
  pdf.line(margin + 6, signatureY, margin + 70, signatureY);
  pdf.line(
    pageWidth - margin - 70,
    signatureY,
    pageWidth - margin - 6,
    signatureY,
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...THEME.text);
  const firmante = "Mauricio Contreras";
  pdf.text(safeText(firmante), margin + 38, signatureY + 5, {
    align: "center",
  });
  pdf.text(
    safeText(input.asignadoPara),
    pageWidth - margin - 38,
    signatureY + 5,
    { align: "center" },
  );
  pdf.setFontSize(8);
  pdf.text(
    "Jefe de Informatica y aplicaciones TI",
    margin + 38,
    signatureY + 10,
    { align: "center" },
  );
  pdf.text("RUT:", pageWidth - margin - 70, signatureY + 10);
  const rutValue = input.rut ? input.rut : "";
  if (rutValue) {
    pdf.text(rutValue, pageWidth - margin - 56, signatureY + 10);
  }
  pdf.line(
    pageWidth - margin - 58,
    signatureY + 10,
    pageWidth - margin - 6,
    signatureY + 10,
  );

  pdf.setDrawColor(...THEME.accent);
  pdf.setLineWidth(0.8);
  pdf.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

  const archivoSuffix =
    numeroActaValue === "S/C"
      ? `SIN_CORRELATIVO_${formatDateCompact(input.fecha)}`
      : numeroActaValue;
  const nombreArchivo = `Acta_Entrega_${archivoSuffix}.pdf`;
  pdf.save(nombreArchivo);
}
