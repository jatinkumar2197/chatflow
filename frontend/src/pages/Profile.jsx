import { useRef, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import QrCard from "../components/QrCard.jsx";
import { useAuth } from "../hooks/useAuth";
import { updateProfile, uploadProfilePicture, API_BASE_URL } from "../services/api";
import { resolveAssetUrl, initials } from "../utils/format";

export default function Profile() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ username: user.username, email: user.email });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await updateProfile(form);
      setUser(res.data);
      localStorage.setItem("chatflow_user", JSON.stringify(res.data));
      setMessage("Profile updated.");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadProfilePicture(formData);
    setUser(res.data);
    localStorage.setItem("chatflow_user", JSON.stringify(res.data));
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {user.profile_image ? (
                  <img
                    src={resolveAssetUrl(user.profile_image, API_BASE_URL)}
                    alt={user.username}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-semibold">
                    {initials(user.username)}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center border-2 border-white"
                  title="Change photo"
                >
                  ✎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handlePictureChange}
                />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{user.username}</p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500">Username</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              {message && <p className="text-xs text-slate-500">{message}</p>}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          <QrCard />
        </div>
      </div>
    </div>
  );
}
