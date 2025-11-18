// src/pages/NuevoTicket.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createTicket } from "../services/tickets";
import type { TicketPayload } from "../services/tickets";
import AppHeader from "../components/AppHeader";

const AUTHORIZED_ADMINS = ["mcontreras", "ejimenez", "igonzalez"] as const;

// Generador simple de ticketId
function genTicketId() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
    d.getDate()
  )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TCK-${stamp}-${rand}`;
}

const TITLES: TicketPayload["title"][] = [
  "SAP",
  "Impresoras",
  "Cuentas",
  "Rinde Gastos",
  "Terreno",
  "Otros",
];
const RISKS: TicketPayload["risk"][] = ["alto", "medio", "bajo"];

export default function NuevoTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Bloquear acceso a administradores
  useEffect(() => {
    const username = user?.nombreUsuario || user?.usuario;
    const isAdmin = AUTHORIZED_ADMINS.includes(username as any);
    if (isAdmin) {
      navigate("/menu", { replace: true });
    }
  }, [user, navigate]);

  const [title, setTitle] = useState<TicketPayload["title"] | null>(null);
  const [risk, setRisk] = useState<TicketPayload["risk"]>("bajo");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const submittingRef = useRef(false);

  // Función para comprimir una imagen
  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("El archivo no es una imagen"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Configuración de compresión
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;
          const QUALITY = 0.82;

          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo el aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }

          // Crear canvas para redimensionar
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No se pudo crear el contexto del canvas"));
            return;
          }

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a base64 con compresión
          const compressedDataUrl = canvas.toDataURL("image/jpeg", QUALITY);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files) return;
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      setError("Ya has alcanzado el máximo de 5 imágenes");
      return;
    }

    const arr = Array.from(files).slice(0, remainingSlots);
    setCompressing(true);
    setError(null);

    try {
      const compressed = await Promise.all(
        arr.map(async (file) => {
          try {
            return await compressImage(file);
          } catch (err) {
            console.error("Error comprimiendo imagen:", err);
            return "";
          }
        })
      );

      const validImages = compressed.filter(Boolean);
      if (validImages.length > 0) {
        setImages([...images, ...validImages]);
      }
      if (validImages.length < arr.length) {
        setError(
          `${arr.length - validImages.length} imagen(es) no pudieron procesarse`
        );
      }
    } catch (err) {
      setError("Error procesando las imágenes");
    } finally {
      setCompressing(false);
    }
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedId(null);
    // Evitar envíos múltiples por doble click o Enter repetido
    if (loading || submittingRef.current) return;

    if (!title || !description.trim()) {
      setError("Selecciona un área (title) y escribe una descripción.");
      return;
    }
    if (!user?.nombreUsuario) {
      setError("Sesión no válida. Vuelve a iniciar sesión.");
      return;
    }

    const ticketId = genTicketId();
    const firstName =
      typeof user.primerNombre === "string" ? user.primerNombre.trim() : "";
    const lastName =
      typeof user.primerApellido === "string" ? user.primerApellido.trim() : "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    const payload: TicketPayload = {
      ticketId,
      title,
      description: description.trim(),
      userId: user.nombreUsuario,
      userName: fullName || firstName || user.nombreUsuario,
      userLastName: lastName || undefined,
      userFullName: fullName || undefined,
      risk,
      state: "recibido",
      images: images.length ? images : undefined,
    };

    try {
      submittingRef.current = true;
      setLoading(true);
      const resp = await createTicket(payload);
      if (!resp.ok) throw new Error(resp.error || "Error al crear el ticket");
      setCreatedId(ticketId);
      // Redirigir a MisTickets tras crear exitosamente
      navigate("/tickets");
    } catch (err: any) {
      // Si hay imágenes y falla la conexión, probablemente es por tamaño
      if (images.length > 0 && (err?.message?.includes("conexión") || err?.message?.includes("conectar"))) {
        setError(
          `Las imágenes son demasiado pesadas. Intenta con: ${images.length > 2 ? "menos imágenes (máx. 2-3)" : "imágenes más pequeñas"}`
        );
      } else {
        setError(err?.message || "No se pudo crear el ticket");
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden flex items-center justify-center px-4 py-16 md:py-24">
      {/* Fondos decorativos */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #f97316 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #ea580c 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-2xl my-10">
        <AppHeader
          title="Crear ticket"
          subtitle="Completa el formulario y guarda tu incidencia"
          backTo="/menu"
        />

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-5"
        >
          {/* Categoría */}
          <div className="space-y-2 text-center">
            <label className="text-lg text-neutral-300 mb-44">
              <strong>Categoría</strong>
            </label>
            <select
              className="w-full rounded-xl mt-5 bg-neutral-900/70 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={title ?? ""}
              onChange={(e) =>
                setTitle(e.target.value as TicketPayload["title"])
              }
            >
              <option value="" disabled>
                Seleccione una categoría
              </option>
              {TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div className="space-y-2 text-center">
            <label className="text-lg text-neutral-300">
              <strong>Descripción</strong>
            </label>
            <textarea
              rows={5}
              className="w-full rounded-xl mt-5 bg-neutral-900/70 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema o solicitud con el mayor detalle posible."
            />
          </div>

          {/* Imágenes (opcional) */}
          <div className="space-y-2 text-center">
            <label className="text-lg text-neutral-300">
              <strong>Adjuntar imágenes</strong>{" "}
              <span className="text-sm text-neutral-400">
                (opcional, máx. 5)
              </span>
            </label>
            <p className="text-xs text-neutral-400 mt-1">
              Las imágenes se comprimen automáticamente para optimizar el envío
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={compressing}
              onChange={(e) => onFilesSelected(e.target.files)}
              className="w-full rounded-xl mt-2 bg-neutral-900/70 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {compressing && (
              <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-300 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Comprimiendo imágenes...
              </div>
            )}
            {!!images.length && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={src}
                      alt={`adjunto-${i}`}
                      className="h-24 w-full object-cover rounded-lg border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg opacity-90 hover:opacity-100 transition"
                      title="Eliminar imagen"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Riesgo */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Riesgo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RISKS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRisk(r)}
                  className={[
                    "rounded-xl px-4 py-2 ring-1 ring-white/10 bg-neutral-900/70 hover:bg-white/10 transition",
                    risk === r ? "outline-2 outline-orange-500" : "",
                  ].join(" ")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {createdId && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Ticket creado: <span className="font-semibold">{createdId}</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-orange-600 px-5 py-3 font-semibold transition hover:bg-orange-500 disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
