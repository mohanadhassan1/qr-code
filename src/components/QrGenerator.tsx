"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

type Mode = "redirect" | "website" | "plain";

const DEFAULT_REDIRECT_URL = "https://www.example.com/app-redirect";

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function QrGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<Mode>("redirect");
  const [websiteUrl, setWebsiteUrl] = useState("https://www.example.com");
  const [redirectUrl, setRedirectUrl] = useState(DEFAULT_REDIRECT_URL);

  const [size, setSize] = useState(900); // print-friendly
  const [logoRatio, setLogoRatio] = useState(0.20); // 20% of QR width (only for logo modes)
  const [margin, setMargin] = useState(2);

  const [error, setError] = useState<string | null>(null);

  const embedLogo = mode !== "plain";

  const targetUrl = useMemo(() => {
    if (mode === "redirect") return redirectUrl.trim();
    return websiteUrl.trim();
  }, [mode, redirectUrl, websiteUrl]);

  const canGenerate = useMemo(() => isValidHttpUrl(targetUrl), [targetUrl]);

  useEffect(() => {
    const run = async () => {
      setError(null);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (!canGenerate) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setError("Please enter a valid http/https URL.");
        return;
      }

      canvas.width = size;
      canvas.height = size;

      try {
        // 1) Draw QR onto canvas
        await QRCode.toCanvas(canvas, targetUrl, {
          errorCorrectionLevel: embedLogo ? "H" : "M",
          margin,
          width: size,
          color: { dark: "#000000", light: "#FFFFFF" },
        });

        // 2) Optional overlay logo + white background
        if (embedLogo) {
          const logo = await loadImage("/logo.png");

          const logoSize = Math.floor(size * logoRatio);
          const x = Math.floor(size / 2 - logoSize / 2);
          const y = Math.floor(size / 2 - logoSize / 2);

          // White background behind logo (helps scanning)
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(x, y, logoSize, logoSize);

          // Draw logo
          ctx.drawImage(logo, x, y, logoSize, logoSize);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to generate QR.";
        setError(message);
      }
    };

    run();
  }, [targetUrl, size, logoRatio, margin, canGenerate, embedLogo]);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");

    const fileName =
      mode === "redirect"
        ? "qr-redirect.png"
        : mode === "website"
          ? "qr-website.png"
          : "qr-plain.png";

    a.download = fileName;
    a.click();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">QR Studio</h2>
        <p className="mt-1 text-sm text-gray-600">
          Generate a QR for a redirect link, a website link — or a plain QR without a logo.
        </p>

        <div className="mt-5 space-y-4">
          <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
            <button
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
                mode === "redirect" ? "bg-white shadow text-black" : "text-gray-600"
              }`}
              onClick={() => setMode("redirect")}
              type="button"
            >
              Redirect QR
            </button>

            <button
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
                mode === "website" ? "bg-white shadow text-black" : "text-gray-600"
              }`}
              onClick={() => setMode("website")}
              type="button"
            >
              Website QR
            </button>

            <button
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
                mode === "plain" ? "bg-white shadow text-black" : "text-gray-600"
              }`}
              onClick={() => setMode("plain")}
              type="button"
            >
              QR (No Logo)
            </button>
          </div>

          {mode === "redirect" ? (
            <div>
              <label className="text-sm font-medium text-gray-900">Redirect URL</label>
              <input
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="https://yourdomain.com/en/app-redirect"
              />
              <p className="mt-2 text-xs text-gray-500">
                Use your own smart redirect page (Android → Play Store, iOS → App Store, Desktop → website).
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-900">Website URL</label>
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="https://www.example.com"
              />
              {mode === "plain" && (
                <p className="mt-2 text-xs text-gray-500">
                  This mode generates a plain QR (no logo overlay).
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-900">Size (px)</label>
              <input
                type="number"
                min={300}
                max={2000}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900">Margin</label>
              <input
                type="number"
                min={0}
                max={8}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          {embedLogo && (
            <div>
              <label className="text-sm font-medium text-gray-900">Logo size</label>
              <input
                type="range"
                min={0.14}
                max={0.26}
                step={0.01}
                value={logoRatio}
                onChange={(e) => setLogoRatio(Number(e.target.value))}
                className="mt-2 w-full cursor-pointer"
              />
              <p className="mt-1 text-xs text-gray-500">
                Keep it around 0.18–0.22 for best scan reliability.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={downloadPng}
            disabled={!canGenerate}
            className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PNG
          </button>

          <div className="text-xs text-gray-500">
            Tip: For print, 900–1200px is great. Always test on iPhone + Android.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
            <p className="mt-1 break-all text-xs text-gray-500">{targetUrl}</p>
          </div>

          {embedLogo ? (
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
              <Image src="/logo.png" alt="Logo" width={22} height={22} />
              <span className="text-xs text-gray-600">Logo embedded</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
              <span className="text-xs text-gray-600">No logo</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-xl border bg-white"
            style={{ maxWidth: "520px", maxHeight: "520px", width: "100%", height: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}
