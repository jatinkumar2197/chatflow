import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import Navbar from "../components/Navbar.jsx";
import { scanQr, API_BASE_URL } from "../services/api";
import { resolveAssetUrl, initials } from "../utils/format";

const SCANNER_ELEMENT_ID = "qr-scanner-region";

/** Extract the trailing UUID segment from either a raw UUID or a deep link URL. */
function extractQrUuid(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/([0-9a-fA-F-]{36})$/);
  return match ? match[1] : trimmed;
}

export default function ScanQR() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { user, conversation_exists }
  const [recentScans, setRecentScans] = useState(() => {
    const stored = localStorage.getItem("chatflow_recent_scans");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const handleScanSuccess = async (decodedText) => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      setScanning(false);
    }
    try {
      const qrUuid = extractQrUuid(decodedText);
      const res = await scanQr(qrUuid);
      setResult(res.data);
      setError("");

      const updated = [
        res.data.user,
        ...recentScans.filter((u) => u.id !== res.data.user.id),
      ].slice(0, 5);
      setRecentScans(updated);
      localStorage.setItem("chatflow_recent_scans", JSON.stringify(updated));
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or unrecognized QR code.");
    }
  };

  const startScanning = async () => {
    setError("");
    setResult(null);
    setScanning(true);
    try {
      const html5Qr = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = html5Qr;
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScanSuccess,
        () => {} // ignore per-frame scan failures
      );
    } catch (err) {
      setError("Camera access denied or unavailable. Please check permissions.");
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    await scannerRef.current?.stop().catch(() => {});
    setScanning(false);
  };

  const goToChat = (partner) => {
    navigate("/dashboard", { state: { startChatWith: partner } });
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-md mx-auto py-10 px-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
            <p className="font-semibold text-slate-800 mb-1">Scan a ChatFlow QR Code</p>
            <p className="text-xs text-slate-400 mb-4">
              Point your camera at someone's QR code to start chatting instantly.
            </p>

            <div
              id={SCANNER_ELEMENT_ID}
              className={`mx-auto rounded-xl overflow-hidden bg-black ${scanning ? "block" : "hidden"}`}
              style={{ width: "100%", maxWidth: 300 }}
            />

            {!scanning && (
              <button
                onClick={startScanning}
                className="px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium"
              >
                Start Camera
              </button>
            )}
            {scanning && (
              <button
                onClick={stopScanning}
                className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium mt-3"
              >
                Stop Scanning
              </button>
            )}

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
          </div>

          {result && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center">
              {result.user.profile_image ? (
                <img
                  src={resolveAssetUrl(result.user.profile_image, API_BASE_URL)}
                  alt={result.user.username}
                  className="w-16 h-16 rounded-full object-cover mb-3"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-semibold mb-3">
                  {initials(result.user.username)}
                </div>
              )}
              <p className="font-semibold text-slate-800">{result.user.username}</p>
              <p className="text-xs text-slate-400 mb-4">
                {result.user.is_online ? "Online now" : "Offline"}
              </p>
              <button
                onClick={() => goToChat(result.user)}
                className="px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium"
              >
                {result.conversation_exists ? "Open Chat" : "Start Chat"}
              </button>
            </div>
          )}

          {recentScans.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Recently Scanned
              </p>
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {recentScans.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => goToChat(u)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left"
                  >
                    {u.profile_image ? (
                      <img
                        src={resolveAssetUrl(u.profile_image, API_BASE_URL)}
                        alt={u.username}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                        {initials(u.username)}
                      </div>
                    )}
                    <span className="text-sm text-slate-700">{u.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
