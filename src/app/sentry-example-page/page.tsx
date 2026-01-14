"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] rounded-xl p-8 max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-white">🔍 Test de Sentry</h1>
        
        <p className="text-gray-400">
          Hacé click en el botón para enviar un error de prueba a Sentry.
        </p>
        
        <button
          type="button"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          onClick={() => {
            Sentry.startSpan(
              {
                name: "Example Frontend Span",
                op: "test",
              },
              async () => {
                const res = await fetch("/api/sentry-example-api");
                if (!res.ok) {
                  throw new Error("Sentry Example Frontend Error");
                }
              }
            );
          }}
        >
          🚀 Enviar Error de Prueba
        </button>

        <button
          type="button"
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          onClick={() => {
            try {
              throw new Error("Error intencional de prueba - BraCamp");
            } catch (error) {
              Sentry.captureException(error);
              console.log("✅ Error enviado a Sentry!");
            }
          }}
        >
          💥 Generar Error Fatal
        </button>

        <p className="text-sm text-gray-500">
          Después de hacer click, revisá tu dashboard de Sentry para ver el error capturado.
        </p>
      </div>
    </div>
  );
}

