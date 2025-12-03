import { useEffect, useState } from "react";

const SOCKET_URL = "https://192.168.200.80:3006";

export function SSLCertificateCheck() {
  const [certStatus, setCertStatus] = useState<"checking" | "accepted" | "rejected">("checking");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkCertificate();
  }, []);

  const checkCertificate = async () => {
    try {
      // Intentar hacer una petición al servidor Socket.IO
      await fetch(`${SOCKET_URL}/socket.io/`, {
        method: "GET",
        mode: "no-cors", // Permite la petición incluso con certificado inválido
      });

      // Si llegamos aquí sin error, el certificado fue aceptado
      setCertStatus("accepted");
    } catch (error) {
      // Error de certificado o conexión
      setCertStatus("rejected");
      setShowModal(true);
    }
  };

  const handleAcceptCertificate = () => {
    // Abrir el servidor en una nueva ventana para forzar la aceptación del certificado
    const width = 600;
    const height = 400;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      SOCKET_URL,
      "Aceptar certificado SSL",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Verificar cada segundo si la ventana fue cerrada
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        // Esperar un momento y volver a verificar el certificado
        setTimeout(() => {
          checkCertificate();
        }, 500);
      }
    }, 1000);
  };

  if (certStatus === "accepted") {
    return null; // No mostrar nada si el certificado está aceptado
  }

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-orange-500/30 bg-neutral-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
            <svg
              className="h-6 w-6 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Certificado SSL requerido
            </h3>
            <p className="text-sm text-neutral-400">
              Configuración de seguridad necesaria
            </p>
          </div>
        </div>

        <div className="mb-6 space-y-3 text-sm text-neutral-300">
          <p>
            Para recibir notificaciones en tiempo real, necesitas aceptar el
            certificado SSL del servidor.
          </p>
          <p className="text-xs text-neutral-400">
            Esta es una configuración única y segura para aplicaciones internas.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAcceptCertificate}
            className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-500"
          >
            Aceptar certificado SSL
          </button>
          <button
            onClick={() => setShowModal(false)}
            className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-neutral-300 transition hover:bg-white/5"
          >
            Continuar sin notificaciones
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-neutral-800/50 p-3 text-xs text-neutral-400">
          <p className="font-medium text-neutral-300 mb-1">Instrucciones:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Se abrirá una ventana nueva</li>
            <li>Haz clic en "Avanzado" o "Advanced"</li>
            <li>Acepta el certificado y cierra la ventana</li>
            <li>Las notificaciones funcionarán automáticamente</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
