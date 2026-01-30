import jsPDF from "jspdf";
import logoImg from "../assets/vivipra.png";

const EMAIL_BASE =
  import.meta.env.VITE_EMAIL_BASE || "http://192.168.200.80:3005/api";

export type EmailResponse = {
  ok: boolean;
  data?: any;
  error?: string;
};

export type TicketEmailPayload = {
  destinatario: string;
  asunto: string;
  mensaje?: string;
  nota?: Record<string, any>;
  archivo?: Blob;
  nombreArchivo?: string;
};

type LogoData = { dataUrl: string; width: number; height: number };

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
        resolve({ dataUrl, width: image.width, height: image.height });
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

async function buildTicketPdf(nota?: Record<string, any>) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const logoData = await getLogoData();
  if (logoData) {
    const maxLogoWidth = Math.min(200, pageWidth * 0.45);
    const ratio = logoData.width ? logoData.height / logoData.width : 0.3;
    const logoWidth = maxLogoWidth;
    const logoHeight = logoWidth * ratio;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 40;
    doc.addImage(logoData.dataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
  }

  const message =
    "El area de informatica esta trabajando en su solicitud";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);

  const lines = doc.splitTextToSize(message, pageWidth - 120);
  const lineHeight = 24;
  const blockHeight = lines.length * lineHeight;
  const textY = (pageHeight - blockHeight) / 2 + 10;
  doc.text(lines, pageWidth / 2, textY, { align: "center" });

  const ticketId = nota?.ticketId ? `Ticket: ${nota.ticketId}` : "";
  if (ticketId) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(ticketId, pageWidth / 2, pageHeight - 60, { align: "center" });
  }

  return doc.output("blob");
}

export async function sendTicketEmail(
  payload: TicketEmailPayload
): Promise<EmailResponse> {
  if (!payload.destinatario) {
    return { ok: false, error: "Destinatario requerido" };
  }

  const form = new FormData();
  form.append("destinatario", payload.destinatario);
  form.append("asunto", payload.asunto);
  form.append("mensaje", payload.mensaje || "");
  form.append("nota", JSON.stringify(payload.nota || {}));
  const archivo =
    payload.archivo ||
    (await buildTicketPdf(payload.nota || {}));
  form.append(
    "archivo",
    archivo,
    payload.nombreArchivo || `ticket-${payload.nota?.ticketId || "sin-id"}.pdf`
  );

  const response = await fetch(`${EMAIL_BASE}/email/nota-venta-aprobada`, {
    method: "POST",
    body: form,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const ok = response.ok && (data?.ok ?? true);
  return {
    ok,
    data,
    error: ok ? undefined : data?.error || response.statusText,
  };
}
