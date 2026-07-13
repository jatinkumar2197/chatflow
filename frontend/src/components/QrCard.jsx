import { useEffect, useState } from "react";
import { fetchMyQr, regenerateQr, API_BASE_URL } from "../services/api";

export default function QrCard() {
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchMyQr()
      .then((res) => setQr(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDownload = () => {
    if (!qr?.qr_image_url) return;
    const link = document.createElement("a");
    link.href = `${API_BASE_URL}${qr.qr_image_url}`;
    link.download = "chatflow-qr.png";
    link.click();
  };

  const handleCopyLink = async () => {
    if (!qr?.deep_link) return;
    await navigator.clipboard.writeText(qr.deep_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRegenerate = async () => {
    await regenerateQr();
    load();
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Loading QR...</div>;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center">
      <p className="text-sm font-semibold text-slate-700 mb-1">Your ChatFlow QR Code</p>
      <p className="text-xs text-slate-400 mb-4">
        Anyone who scans this can start a chat with you instantly.
      </p>

      {qr?.qr_image_url ? (
        <img
          src={`${API_BASE_URL}${qr.qr_image_url}`}
          alt="Your QR code"
          className="w-48 h-48 rounded-xl border border-slate-100 p-2"
        />
      ) : (
        <div className="w-48 h-48 flex items-center justify-center text-slate-300 text-xs border border-dashed rounded-xl">
          No QR yet
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <button
          onClick={handleDownload}
          className="px-4 py-2 text-xs rounded-lg bg-brand-500 text-white font-medium"
        >
          Download PNG
        </button>
        <button
          onClick={handleCopyLink}
          className="px-4 py-2 text-xs rounded-lg bg-slate-100 text-slate-600 font-medium"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleRegenerate}
          className="px-4 py-2 text-xs rounded-lg bg-slate-100 text-slate-600 font-medium"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}
