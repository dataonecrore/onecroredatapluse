import { useEffect, useState } from "react";
import { FollowUps } from "./FollowUps";

const PUBLIC_API_BASE_URL = "https://onecroredatapluse-production.up.railway.app";
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isLoopbackApi = configuredApiBaseUrl
  ? /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/.test(configuredApiBaseUrl)
  : false;
const API_BASE_URL =
  import.meta.env.PROD && isLoopbackApi
    ? PUBLIC_API_BASE_URL
    : configuredApiBaseUrl || PUBLIC_API_BASE_URL;
const isDemoMode = import.meta.env.VITE_BYPASS_LOGIN === "true";
const DEMO_CUSTOMERS = [
  {
    id: "demo-001",
    name: "BIXAM TARALA",
    email: "demo@example.com",
    address: "Demo workspace",
  },
];
const APPEARANCE_OPTIONS = [
  ["light", "☼", "Light", "Bright and clean"],
  ["dark", "☾", "Dark", "Neutral charcoal"],
  ["night", "✧", "Night", "Deep navy"],
];

let authToken = sessionStorage.getItem("onecrore-access-token") || "";

function setAuthToken(token) {
  authToken = token || "";
  if (authToken) sessionStorage.setItem("onecrore-access-token", authToken);
  else sessionStorage.removeItem("onecrore-access-token");
}

function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  return fetch(url, { ...options, headers });
}

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    if ((!isSignup && !email.trim()) || !password.trim() || (isSignup && !name.trim())) {
      setError(isSignup ? "Please enter your name, email, and password." : "Please enter both email and password.");
      return;
    }

    if (isSignup && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, ...(isSignup ? { name: name.trim() } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to sign in.");
      if (isSignup) {
        setMessage(data.message);
        setPassword("");
        return;
      }
      setAuthToken(data.access_token);
      onLogin(data.user);
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    }
  };

  if (isRecovery) {
    return (
      <PasswordRecoveryRequest
        email={email}
        onBack={() => {
          setIsRecovery(false);
          setError("");
          setMessage("");
        }}
      />
    );
  }

  return (
    <div className="login-page flex min-h-screen items-center justify-center px-3 py-4 sm:px-6 lg:px-8">
      <div className="login-shell grid w-full max-w-[1240px] overflow-hidden rounded-[28px] bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="login-hero relative hidden overflow-hidden p-10 text-white sm:p-12 lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between xl:p-14">
          <div className="login-grid-lines" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="login-brand-mark flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold">◉</div>
              <h1 className="text-xl font-bold tracking-tight">OneCrore CRM</h1>
            </div>

            <div className="mt-20 max-w-xl">
              <p className="login-eyebrow inline-flex rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Customer intelligence</p>
              <h2 className="mt-6 text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">
                Manage every customer relationship from <span className="text-blue-300">one place.</span>
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 xl:text-lg">
                Search customers, maintain records, track activity, and manage your customer database through a clean and secure workspace.
              </p>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[["♧", "Customer", "Management"], ["⌁", "Activity", "Tracking"], ["◇", "Secure", "Workspace"]].map(([icon, firstLine, secondLine]) => (
                <div key={firstLine} className="text-center text-xs text-blue-100">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/20 text-xl text-blue-200">{icon}</div>
                  <p className="mt-2">{firstLine}</p>
                  <p>{secondLine}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="login-dashboard-art relative z-10 mt-10 flex items-end gap-4" aria-hidden="true">
            <div className="login-art-card h-20 w-28 -rotate-12 rounded-xl p-3"><div className="h-3 w-3 rounded-full bg-blue-300" /><div className="mt-3 h-2 w-16 rounded bg-blue-300/60" /><div className="mt-2 h-2 w-20 rounded bg-blue-300/30" /></div>
            <div className="login-art-card h-28 w-36 rotate-[-7deg] rounded-xl p-3"><div className="mt-12 h-2 w-20 rounded bg-blue-300/40" /><div className="mt-2 h-2 w-28 rounded bg-blue-300/20" /></div>
            <div className="login-art-chart flex h-28 w-32 items-center justify-center rounded-xl">◔</div>
          </div>
          <p className="relative z-10 mt-8 text-sm text-blue-200">◈ Secure. Reliable. Built for growth.</p>
        </section>

        <section className="login-form-panel flex min-h-[650px] items-center justify-center px-6 py-10 sm:px-12 lg:px-14 xl:px-20">
          <div className="w-full max-w-[520px]">
            <div className="mb-10 lg:hidden"><p className="text-lg font-bold text-slate-950">OneCrore CRM</p></div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">{isSignup ? "Get started" : "Welcome back"}</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{isSignup ? "Create your account" : "Sign in to your account"}</h2>
            <p className="mt-4 text-base text-slate-500">{isSignup ? "Create a user account to access OneCrore CRM." : "Enter your credentials to access OneCrore CRM."}</p>

            <form className="mt-10 space-y-6" onSubmit={handleLogin}>
              {isSignup && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Full name</label>
                  <div className="login-input-wrap mt-2"><span aria-hidden="true">♙</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="w-full border-0 bg-transparent px-3 py-3.5 outline-none" /></div>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700">Email address</label>
                <div className="login-input-wrap mt-2"><span aria-hidden="true">✉</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full border-0 bg-transparent px-3 py-3.5 outline-none" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3"><label className="block text-sm font-semibold text-slate-700">Password</label>{!isSignup && <button type="button" onClick={() => setIsRecovery(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Forgot password?</button>}</div>
                <div className="login-input-wrap mt-2"><span aria-hidden="true">♙</span><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full border-0 bg-transparent px-3 py-3.5 outline-none" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="px-2 text-slate-500 hover:text-slate-800">{showPassword ? "Hide" : "◉"}</button></div>
              </div>
              {!isSignup && <label className="flex items-center gap-3 text-sm text-slate-600"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 accent-blue-600" />Remember me</label>}
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
              <button type="submit" className="login-submit w-full rounded-xl px-4 py-3.5 font-semibold text-white transition hover:opacity-90">{isSignup ? "Create account" : "Sign in"} <span className="ml-2">→</span></button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">{isSignup ? "Already have an account?" : "Do not have an account?"} <button type="button" onClick={() => { setIsSignup((value) => !value); setError(""); setMessage(""); }} className="font-semibold text-blue-600">{isSignup ? "Sign in" : "Create one"}</button></p>
          </div>
        </section>
      </div>
    </div>
  );
}

function PasswordRecoveryRequest({ email: initialEmail, onBack }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const requestReset = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setError("");
    setMessage("");
    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to start password recovery.");
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="login-page flex min-h-screen items-center justify-center px-3 py-4 sm:px-6 lg:px-8">
      <div className="login-form-panel w-full max-w-xl rounded-[28px] px-6 py-10 shadow-2xl sm:px-12">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">Account recovery</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Recover your account</h1>
        <p className="mt-4 text-base text-slate-500">Enter your email and we will send you a secure password reset link.</p>
        <form className="mt-8 space-y-5" onSubmit={requestReset}>
          <div className="login-input-wrap"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="w-full border-0 bg-transparent px-3 py-3.5 outline-none" /></div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          <button type="submit" disabled={sending} className="login-submit w-full rounded-xl px-4 py-3.5 font-semibold text-white disabled:opacity-60">{sending ? "Sending..." : "Send recovery link"}</button>
          <button type="button" onClick={onBack} className="w-full font-semibold text-blue-600">Return to sign in</button>
        </form>
      </div>
    </div>
  );
}

function PasswordRecovery({ accessToken, onComplete }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updatePassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!accessToken) {
      setError("Open the password recovery link from your email before updating your password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to update password.");
      setMessage(data.message);
      setPassword("");
      setConfirmation("");
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-page flex min-h-screen items-center justify-center px-3 py-4 sm:px-6 lg:px-8">
      <div className="login-form-panel w-full max-w-xl rounded-[28px] px-6 py-10 shadow-2xl sm:px-12">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">Account recovery</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Set a new password</h1>
        <p className="mt-4 text-base text-slate-500">Choose a new password for your OneCrore CRM account.</p>
        <form className="mt-8 space-y-5" onSubmit={updatePassword}>
          <div className="login-input-wrap"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="w-full border-0 bg-transparent px-3 py-3.5 outline-none" /></div>
          <div className="login-input-wrap"><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirm new password" className="w-full border-0 bg-transparent px-3 py-3.5 outline-none" /></div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          <button type="submit" disabled={saving} className="login-submit w-full rounded-xl px-4 py-3.5 font-semibold text-white disabled:opacity-60">{saving ? "Updating..." : "Update password"}</button>
          {message && <button type="button" onClick={onComplete} className="w-full font-semibold text-blue-600">Return to sign in</button>}
        </form>
      </div>
    </div>
  );
}

function CustomerForm({ customer, onSave, onCancel, saving }) {
  const [form, setForm] = useState(
    customer || {
      name: "",
      email: "",
      phone: "",
      whatsapp_phone: "",
      address: "",
      notes: "",
      sms_opt_in: false,
      whatsapp_opt_in: false,
      email_opt_in: false,
    }
  );

  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name?.trim() || !form.phone?.trim()) {
      setError("Customer name and phone number are required.");
      return;
    }

    setError("");

    try {
      await onSave({
        name: form.name,
        email: form.email?.trim() || null,
        phone: form.phone || "",
        whatsapp_phone: form.whatsapp_phone || "",
        address: form.address || "",
        notes: form.notes || "",
        sms_opt_in: Boolean(form.sms_opt_in),
        whatsapp_opt_in: Boolean(form.whatsapp_opt_in),
        email_opt_in: Boolean(form.email_opt_in),
      });
    } catch (err) {
      setError(err.message || "Unable to save customer.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">
            {customer ? "Edit Customer" : "Add Customer"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter customer information below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Full Name
            </label>

            <input
              value={form.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Customer full name"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Email (optional)
            </label>

            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="customer@example.com"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Phone number
            </label>

            <input
              type="tel"
              value={form.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              WhatsApp number (optional)
            </label>

            <input
              type="tel"
              value={form.whatsapp_phone || ""}
              onChange={(e) => updateField("whatsapp_phone", e.target.value)}
              placeholder="Same as phone or another number"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Address
            </label>

            <input
              value={form.address || ""}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Customer address"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Notes
            </label>

            <textarea
              value={form.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Customer notes"
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-700">Marketing consent</legend>
            <p className="mt-1 text-xs text-slate-500">Only selected channels can be used for future campaigns.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {["sms", "whatsapp", "email"].map((channel) => <label key={channel} className="flex items-center gap-2 text-sm capitalize text-slate-700"><input type="checkbox" checked={Boolean(form[`${channel}_opt_in`])} onChange={(event) => updateField(`${channel}_opt_in`, event.target.checked)} className="h-4 w-4 accent-blue-600" />{channel}</label>)}
            </div>
          </fieldset>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : customer ? "Update Customer" : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerDetails({ customer, onEdit, onClose, onDelete, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">Customer Details</h2>
          <p className="mt-1 text-sm text-slate-500">View customer information.</p>
        </div>

        <div className="space-y-4 p-6">
          {[
            ["Name", customer.name],
            ["Email", customer.email || "-"],
            ["Phone", customer.phone || "-"],
            ["WhatsApp", customer.whatsapp_phone || "-"],
            ["Address", customer.address || "-"],
            [
              "Created",
              customer.created_at
                ? new Date(customer.created_at).toLocaleString()
                : "-",
            ],
            ["Notes", customer.notes || "-"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 break-words">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5">
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          <button
            onClick={onEdit}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Edit Customer
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerImport() {
  const [file, setFile] = useState(null);
  const [importMode, setImportMode] = useState("update");
  const [duplicateKeys, setDuplicateKeys] = useState({ phone: true, email: true });
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const toggleDuplicateKey = (key) => {
    setDuplicateKeys((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!file) {
      setError("Choose a CSV or XLSX file first.");
      return;
    }

    if (!duplicateKeys.phone && !duplicateKeys.email) {
      setError("Select at least one duplicate identification field.");
      return;
    }

    setError("");
    setUploading(true);
    setJob(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("import_mode", importMode);
      formData.append(
        "duplicate_keys",
        Object.entries(duplicateKeys)
          .filter(([, enabled]) => enabled)
          .map(([key]) => key)
          .join(",")
      );

      const response = await apiFetch(`${API_BASE_URL}/imports/customers`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Unable to upload file.");
      }

      let currentJob = await response.json();
      setJob(currentJob);

      while (currentJob.status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusResponse = await apiFetch(`${API_BASE_URL}/imports/${currentJob.id}`);

        if (!statusResponse.ok) {
          throw new Error("Unable to read import progress.");
        }

        currentJob = await statusResponse.json();
        setJob(currentJob);
      }
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Admin workspace
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
          Import Customers
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Use this screen only for small validation batches. The production 10-million-row load uses the server-side bulk-import runbook.
        </p>
      </div>

      <form onSubmit={handleUpload} className="mt-6 space-y-5">
        <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-blue-500 hover:bg-blue-50/30">
          <span className="text-3xl text-blue-600">↑</span>
          <span className="mt-3 font-semibold text-slate-900">
            {file ? file.name : "Choose a customer file"}
          </span>
          <span className="mt-1 text-sm text-slate-500">CSV, XLS, or XLSX, up to 100 MB</span>
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>

        <div className="grid gap-5 lg:grid-cols-2">
          <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-slate-900">Import mode</legend>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              {[
                ["update", "Add new + update existing"],
                ["new", "Add new customers only"],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="import-mode"
                    value={value}
                    checked={importMode === value}
                    onChange={(event) => setImportMode(event.target.value)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
            <legend className="px-1 text-sm font-semibold text-slate-900">
              Identify duplicates by
            </legend>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              {[
                ["phone", "Phone number"],
                ["email", "Email address"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={duplicateKeys[key]}
                    onChange={() => toggleDuplicateKey(key)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {job && (
          <div
            className={`import-job-card rounded-2xl border p-5 ${
              job.status === "failed"
                ? "import-job-failed border-red-200 bg-red-50"
                : "border-blue-100 bg-blue-50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{job.filename}</p>
                <p className="mt-1 text-sm text-slate-600">{job.message}</p>
              </div>
              <span
                className={`import-job-status rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  job.status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-white text-blue-700"
                }`}
              >
                {job.status}
              </span>
            </div>
            <div className={`mt-4 h-2 overflow-hidden rounded-full ${job.status === "failed" ? "bg-red-100" : "bg-blue-100"}`}>
              <div
                className={`h-full rounded-full transition-all ${job.status === "failed" ? "bg-red-600" : "bg-blue-600"}`}
                style={{ width: `${job.progress || 0}%` }}
              />
            </div>
            {job.status === "ready" && (
              <p className="mt-3 text-sm text-slate-700">
                {job.processed.toLocaleString()} rows processed: {job.created || 0} added, {job.updated || 0} updated, {job.skipped || 0} skipped, {job.invalid.toLocaleString()} invalid.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {uploading ? "Uploading and validating..." : "Start Import"}
        </button>
      </form>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState("");

  const loadUsers = async (query = userSearch, signal) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const url = `${API_BASE_URL}/auth/users${params.size ? `?${params}` : ""}`;
      const response = await apiFetch(url, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load registered customers.");
      setUsers(data);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const query = userSearch.trim();
    if (query && query.length < 2) {
      setUsers([]);
      setError("");
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      loadUsers(query, controller.signal).catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      });
    }, query ? 300 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [userSearch]);

  const inviteUser = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/users/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to send invitation.");
      setEmail("");
      setMessage(data.message || `Invitation sent to ${data.email}.`);
      await loadUsers(userSearch);
    } catch (inviteError) {
      setError(inviteError.message);
    }
  };

  const updateRole = async (userId, nextRole) => {
    setError("");
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to update role.");
      setUsers((currentUsers) => currentUsers.map((user) => user.id === userId ? { ...user, role: data.role } : user));
    } catch (roleError) {
      setError(roleError.message);
    }
  };

  const deleteUser = async (user) => {
    if (user.is_current) return;

    const userLabel = user.name || user.email;
    const confirmed = window.confirm(
      `Permanently delete ${userLabel}? Their account, follow-ups, and login history will be removed. They can register again later.`
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to delete user.");
      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
      setMessage(data.message || `${userLabel} was deleted.`);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete user.");
    } finally {
      setDeletingUserId("");
    }
  };

  return (
    <div className="dashboard-customers overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-2xl font-bold text-slate-950">Registered Customers</h2>
        <p className="mt-1 text-sm text-slate-500">View people registered on this application and manage their access.</p>
      </div>
      <form onSubmit={inviteUser} className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row">
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@company.com" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-600" />
        <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-2.5">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Invite User</button>
      </form>
      <div className="border-b border-slate-200 p-5">
        <label htmlFor="registered-customer-search" className="mb-2 block text-sm font-semibold text-slate-700">
          Search registered customers
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="registered-customer-search"
            type="search"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search by name or email"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-600"
          />
          {userSearch && (
            <button
              type="button"
              onClick={() => setUserSearch("")}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">Enter at least 2 characters. Search matches customer names and email addresses.</p>
      </div>
      {(message || error) && (
        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm ${error ? "text-red-600" : "text-emerald-600"}`}>
          <p>{error || message}</p>
          {error && <button type="button" onClick={() => loadUsers(userSearch).catch((loadError) => setError(loadError.message))} className="font-semibold underline">Retry</button>}
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {loading && <p className="px-5 py-10 text-center text-sm text-slate-500">Loading registered customers...</p>}
        {!loading && !error && users.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            {userSearch.trim().length === 1
              ? "Enter at least 2 characters to search."
              : userSearch.trim()
                ? `No registered customers match “${userSearch.trim()}”.`
                : "No registered customers found."}
          </p>
        )}
        {!loading && users.map((user) => (
          <div key={user.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{user.name || "Name not provided"}</p>
              <p className="break-all text-sm text-slate-500">{user.email}</p>
              <p className="mt-1 text-xs text-slate-400">
                Registered {user.created_at ? new Date(user.created_at).toLocaleString() : "date unavailable"}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select value={user.role} onChange={(event) => updateRole(user.id, event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-32">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={() => deleteUser(user)}
                disabled={user.is_current || deletingUserId === user.id}
                title={user.is_current ? "You cannot delete your own administrator account" : `Delete ${user.name || user.email}`}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingUserId === user.id ? "Deleting..." : user.is_current ? "Current admin" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings({ user, theme, onThemeChange, onUserUpdate, onLogout, demoMode = false }) {
  const [name, setName] = useState(user?.name || "");
  const [profileStatus, setProfileStatus] = useState({ message: "", error: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState({ message: "", error: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => setName(user?.name || ""), [user?.name]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setProfileStatus({ message: "", error: "Name is required." });
      return;
    }

    setSavingProfile(true);
    setProfileStatus({ message: "", error: "" });
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to update your profile.");
      setName(data.name);
      onUserUpdate(data);
      setProfileStatus({ message: data.message || "Profile updated.", error: "" });
    } catch (updateError) {
      setProfileStatus({ message: "", error: updateError.message || "Unable to update your profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordStatus({ message: "", error: "" });
    if (newPassword.length < 8) {
      setPasswordStatus({ message: "", error: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ message: "", error: "New passwords do not match." });
      return;
    }

    setSavingPassword(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/password-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to update your password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus({ message: data.message || "Password updated successfully.", error: "" });
    } catch (updateError) {
      setPasswordStatus({ message: "", error: updateError.message || "Unable to update your password." });
    } finally {
      setSavingPassword(false);
    }
  };

  const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {demoMode && (
        <div className="settings-demo-notice rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800 xl:col-span-2">
          Profile and password changes are disabled in demo mode. Appearance preferences remain available on this device.
        </div>
      )}
      <section className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Account</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Profile information</h2>
        <p className="mt-1 text-sm text-slate-500">Keep your name current across the workspace.</p>
        <form onSubmit={saveProfile} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Display name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" disabled={demoMode} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
            <input value={user?.email || "Loading account..."} readOnly className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500" />
            <span className="mt-2 block text-xs text-slate-500">Contact an administrator if this email needs to change.</span>
          </label>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">Account role</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold capitalize text-blue-700">{user?.role || "user"}</span>
          </div>
          {(profileStatus.message || profileStatus.error) && <p aria-live="polite" className={`text-sm ${profileStatus.error ? "text-red-600" : "text-emerald-600"}`}>{profileStatus.error || profileStatus.message}</p>}
          <button type="submit" disabled={demoMode || savingProfile || !name.trim() || name.trim() === (user?.name || "")} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {savingProfile ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      <section className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Security</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Change password</h2>
        <p className="mt-1 text-sm text-slate-500">Confirm your current password before choosing a new one.</p>
        <form onSubmit={changePassword} className="mt-6 space-y-4">
          {[
            ["current-password", "Current password", currentPassword, setCurrentPassword, "current-password"],
            ["new-password", "New password", newPassword, setNewPassword, "new-password"],
            ["confirm-password", "Confirm new password", confirmPassword, setConfirmPassword, "new-password"],
          ].map(([id, label, value, setter, autoComplete]) => (
            <label key={id} htmlFor={id} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
              <input id={id} type="password" value={value} onChange={(event) => setter(event.target.value)} autoComplete={autoComplete} required minLength={id === "current-password" ? undefined : 8} disabled={demoMode} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60" />
            </label>
          ))}
          <p className="text-xs text-slate-500">Use at least 8 characters and avoid reusing your current password.</p>
          {(passwordStatus.message || passwordStatus.error) && <p aria-live="polite" className={`text-sm ${passwordStatus.error ? "text-red-600" : "text-emerald-600"}`}>{passwordStatus.error || passwordStatus.message}</p>}
          <button type="submit" disabled={demoMode || savingPassword} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {savingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>

      <section className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Preferences</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Appearance</h2>
        <p className="mt-1 text-sm text-slate-500">Choose how OneCrore CRM looks on this device.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {APPEARANCE_OPTIONS.map(([value, icon, label, description]) => (
            <button key={value} type="button" onClick={() => onThemeChange(value)} aria-pressed={theme === value} className={`settings-appearance-option rounded-xl border p-4 text-left transition ${theme === value ? "settings-appearance-option-active border-blue-600 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}>
              <span aria-hidden="true" className="text-lg text-blue-600">{icon}</span>
              <span className="mt-2 block text-sm font-bold text-slate-900">{label}</span>
              <span className="mt-1 block text-xs text-slate-500">{description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Session</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Sign out</h2>
        <p className="mt-1 text-sm text-slate-500">End your current session on this device.</p>
        <button type="button" onClick={onLogout} className="mt-6 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50">Sign out of OneCrore CRM</button>
      </section>
    </div>
  );
}

const MARKETING_PLANS = [
  ["Starter", "₹999", "Up to 1,000 customers", "CRM, imports, and basic campaigns"],
  ["Growth", "₹2,999", "Up to 10,000 customers", "Automation, segments, and analytics"],
  ["Pro", "₹7,999", "Multiple locations", "Advanced workflows and team controls"],
];

function Campaigns({ demoMode = false, onAddCustomer }) {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ name: "", channel: "whatsapp", audience: "All opted-in customers", message: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ message: "", error: "" });
  const [audienceCount, setAudienceCount] = useState(null);

  const loadCampaigns = async () => {
    if (demoMode) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    try {
      const response = await apiFetch(`${API_BASE_URL}/campaigns`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load campaigns.");
      setCampaigns(data.items || []);
    } catch (error) {
      setStatus({ message: "", error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCampaigns(); }, [demoMode]);

  useEffect(() => {
    if (demoMode) return undefined;
    const params = new URLSearchParams({ channel: form.channel, audience: form.audience });
    apiFetch(`${API_BASE_URL}/campaigns/audience-count?${params}`)
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) setAudienceCount(data.count);
      })
      .catch(() => setAudienceCount(null));
    return undefined;
  }, [demoMode, form.channel, form.audience]);

  const saveCampaign = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ message: "", error: "" });
    if (demoMode) {
      setStatus({ message: "Campaigns are disabled in demo mode.", error: "" });
      setSaving(false);
      return;
    }
    try {
      const response = await apiFetch(`${API_BASE_URL}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to save campaign.");
      setCampaigns((current) => [data, ...current]);
      setForm({ name: "", channel: "whatsapp", audience: "All opted-in customers", message: "" });
      setStatus({ message: "Campaign saved as a draft.", error: "" });
    } catch (error) {
      setStatus({ message: "", error: error.message });
    } finally {
      setSaving(false);
    }
  };

  const sendCampaign = async (campaign) => {
    if (!window.confirm(`Send this campaign to all opted-in ${campaign.channel} recipients?`)) return;
    setStatus({ message: "", error: "" });
    try {
      const response = await apiFetch(`${API_BASE_URL}/campaigns/${campaign.id}/send`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to send campaign.");
      setCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, status: data.status } : item));
      setStatus({ message: `Campaign sent to ${data.sent} recipient${data.sent === 1 ? "" : "s"}.`, error: "" });
    } catch (error) {
      setStatus({ message: "", error: error.message });
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Campaign studio</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Create a campaign</h2>
        <p className="mt-1 text-sm text-slate-500">Build one reusable campaign workflow for any kind of local business.</p>
        <form onSubmit={saveCampaign} className="mt-6 space-y-4">
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Campaign name</span><input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Weekend customer offer" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Channel</span><select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3"><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option></select></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Audience</span><select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3"><option>All opted-in customers</option></select></label>
          </div>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Message</span><textarea required maxLength={2000} rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Write the message your customers will receive..." className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" /></label>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Eligible audience: <strong>{audienceCount === null ? "checking..." : `${audienceCount} opted-in customer${audienceCount === 1 ? "" : "s"}`}</strong></p>
          {(status.message || status.error) && <p aria-live="polite" className={`text-sm ${status.error ? "text-red-600" : "text-emerald-600"}`}>{status.error || status.message}</p>}
          <button type="submit" disabled={saving || demoMode} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : "Save draft"}</button>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Campaigns</p><h2 className="mt-2 text-xl font-bold text-slate-950">Your workspace</h2></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Drafts only</span></div>
        <p className="mt-1 text-sm text-slate-500">Delivery integrations and consent checks come before sending.</p>
        <div className="mt-6 divide-y divide-slate-100">{loading ? <p className="py-8 text-sm text-slate-500">Loading campaigns...</p> : campaigns.length === 0 ? <div className="py-8"><p className="text-sm text-slate-500">No campaigns yet. Your saved drafts will appear here.</p><button type="button" onClick={onAddCustomer} className="mt-5 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">Add customer contact</button></div> : campaigns.map((campaign) => <div key={campaign.id} className="py-4 first:pt-0"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{campaign.name}</p><p className="mt-1 text-sm text-slate-500">{campaign.audience} · {campaign.channel}</p></div><div className="flex items-center gap-3"><span className="text-xs font-bold uppercase text-slate-400">{campaign.status}</span>{campaign.status === "draft" && <button type="button" onClick={() => void sendCampaign(campaign)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Send bulk</button>}</div></div><p className="mt-2 line-clamp-2 text-sm text-slate-600">{campaign.message}</p></div>)}</div>
      </section>
    </div>
  );
}

function Plans() {
  return <div><div className="mb-6"><p className="text-sm text-slate-500">Choose a plan that fits your customer communication volume. Billing activation will be connected before paid checkout.</p></div><div className="grid gap-5 lg:grid-cols-3">{MARKETING_PLANS.map(([name, price, limit, description], index) => <section key={name} className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${index === 1 ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200"}`}><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-slate-950">{name}</h2>{index === 1 && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">Recommended</span>}</div><p className="mt-5 text-3xl font-bold text-slate-950">{price}<span className="text-sm font-medium text-slate-500"> / month</span></p><p className="mt-2 font-semibold text-blue-700">{limit}</p><p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">{description}</p><button type="button" disabled className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-500">Coming soon</button></section>)}</div></div>;
}

const LOGIN_REPORT_PERIODS = [
  ["daily", "Today"],
  ["weekly", "This week"],
  ["monthly", "This month"],
  ["all", "All time"],
];

function LoginReports() {
  const [period, setPeriod] = useState("daily");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = async (selectedPeriod = period) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ period: selectedPeriod, recent_limit: "25" });
      const response = await apiFetch(`${API_BASE_URL}/reports/login-activity?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load login activity.");
      setReport(data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load login activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport(period);
  }, [period]);

  const totalLogins = Number(report?.total_logins || 0);
  const uniqueUsers = Number(report?.unique_users || 0);
  const averageLogins = uniqueUsers ? (totalLogins / uniqueUsers).toFixed(1) : "0.0";
  const maximumBucket = Math.max(1, ...(report?.series || []).map((item) => Number(item.login_count || 0)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Admin analytics</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Login Activity</h2>
          <p className="mt-1 text-sm text-slate-500">Successful web application logins, reported in India Standard Time.</p>
        </div>
        <button type="button" onClick={() => void loadReport()} disabled={loading} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading ? "Refreshing..." : "Refresh report"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Report period">
        {LOGIN_REPORT_PERIODS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${period === value ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Unable to load the report</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Successful logins", totalLogins],
          ["Unique users", uniqueUsers],
          ["Average per user", averageLogins],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{loading && !report ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Login trend</h3>
            <p className="text-sm text-slate-500">Counts for the selected reporting period.</p>
          </div>
          {report?.generated_at && <p className="text-xs text-slate-400">Updated {new Date(report.generated_at).toLocaleString()}</p>}
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-h-56 min-w-max items-end gap-2 border-b border-slate-200 px-2">
            {(report?.series || []).map((item) => (
              <div key={item.bucket_start} className="flex w-12 flex-col items-center justify-end gap-2">
                <span className="text-xs font-semibold text-slate-600">{item.login_count}</span>
                <div className="w-8 rounded-t-lg bg-blue-600" style={{ height: `${Math.max(4, (Number(item.login_count || 0) / maximumBucket) * 150)}px` }} />
                <span className="h-10 text-center text-[10px] leading-tight text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-customers overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="text-lg font-bold text-slate-950">Recent logins</h3>
          <p className="mt-1 text-sm text-slate-500">The latest 25 successful sign-ins.</p>
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {['User', 'Email', 'Login time'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(report?.recent_logins || []).map((login) => (
                <tr key={login.id}>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">{login.user_name || "Name not provided"}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{login.user_email}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{new Date(login.occurred_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-slate-100 sm:hidden">
          {(report?.recent_logins || []).map((login) => (
            <div key={login.id} className="p-4">
              <p className="font-semibold text-slate-900">{login.user_name || "Name not provided"}</p>
              <p className="break-all text-sm text-slate-500">{login.user_email}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(login.occurred_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        {!loading && !error && (report?.recent_logins || []).length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No login events have been recorded yet.</p>}
      </div>

      <p className="text-xs text-slate-400">Tracking begins after the login-events migration and backend deployment. Earlier login history cannot be reconstructed from Supabase Auth.</p>
    </div>
  );
}

function Dashboard({ onLogout, theme, onThemeChange, isAdmin, user, onUserUpdate, demoMode = false }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("auto");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState("Dashboard");
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const resolveSearchField = (query) =>
    searchField === "auto"
      ? /\p{L}/u.test(query)
        ? "name"
        : "phone"
      : searchField;

  const searchCustomers = async ({ cursor = null, append = false, signal } = {}) => {
    const query = search.trim();
    const resolvedField = resolveSearchField(query);
    const minimumLength = resolvedField === "phone" ? 3 : 2;
    if (query.length < minimumLength) {
      setCustomers([]);
      setNextCursor(null);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiError("");

    if (demoMode) {
      const normalizedPhone = query.replace(/\D/g, "");
      const matches = DEMO_CUSTOMERS.filter((customer) =>
        resolvedField === "phone"
          ? String(customer.phone || "").replace(/\D/g, "").startsWith(normalizedPhone)
          : String(customer.name || "").toLowerCase().includes(query.toLowerCase())
      );
      setCustomers(matches);
      setNextCursor(null);
      setHasSearched(true);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ q: query, field: searchField, limit: "25" });
      if (cursor) params.set("cursor", String(cursor));
      const response = await apiFetch(`${API_BASE_URL}/customers/search?${params}`, { signal });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Unable to search customers.");
      }

      const data = await response.json();
      setCustomers((current) => append ? [...current, ...data.items] : data.items);
      setNextCursor(data.next_cursor);
      setHasSearched(true);
      setApiError("");
    } catch (error) {
      if (error.name === "AbortError") return;
      setApiError(
        error instanceof TypeError
          ? `Unable to connect to the backend at ${API_BASE_URL}. Check that the API is running and that VITE_API_BASE_URL points to its public URL.`
          : error.message || "Unable to connect to the backend."
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const minimumLength = resolveSearchField(search.trim()) === "phone" ? 3 : 2;
    if (search.trim().length < minimumLength) {
      setCustomers([]);
      setNextCursor(null);
      setHasSearched(false);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchCustomers({ signal: controller.signal });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, searchField, demoMode]);

  const saveCustomer = async (form) => {
    setSaving(true);
    setApiError("");

    try {
      const isEditing = Boolean(editingCustomer);

      const response = await apiFetch(
        isEditing
          ? `${API_BASE_URL}/customers/${editingCustomer.id}`
          : `${API_BASE_URL}/customers`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) {
        let message = "Unable to save customer.";

        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          // Ignore JSON parse failure.
        }

        throw new Error(message);
      }

      await searchCustomers();
      setShowForm(false);
      setEditingCustomer(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (customer) => {
    const confirmed = window.confirm(
      `Delete ${customer.name}? Their linked follow-ups will also be removed. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setApiError("");

    try {
      const response = await apiFetch(`${API_BASE_URL}/customers/${customer.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete customer.");
      }

      setSelectedCustomer(null);
      await searchCustomers();
    } catch (error) {
      setApiError(error.message || "Unable to delete customer.");
    } finally {
      setDeleting(false);
    }
  };

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const openEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const navItems = isAdmin
    ? [
        ["Dashboard", "▦"],
        ["Customers", "♧"],
        ["Import Customers", "☁"],
        ["Follow-ups", "□"],
        ["Reports", "▥"],
        ["Campaigns", "✦"],
        ["Plans", "◇"],
        ["Settings", "⚙"],
      ]
    : [
        ["Dashboard", "▦"],
        ["Follow-ups", "□"],
        ["Settings", "⚙"],
      ];

  const isCustomerSearchView = activeView === "Dashboard";
  const displayName = user?.name || user?.email || "Your account";
  const avatarInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  const selectView = (item) => {
    setActiveView(item);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!isAdmin && (activeView === "Campaigns" || activeView === "Plans")) {
      setActiveView("Dashboard");
    }
  }, [activeView, isAdmin]);

  return (
    <div className="dashboard-shell min-h-screen bg-slate-100">
      <aside className="dashboard-sidebar fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="dashboard-logo flex h-11 w-11 items-center justify-center rounded-xl">
              <span>◉</span>
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">OneCrore CRM</p>
              <p className="text-xs text-slate-400">Manage Customers. Grow Business.</p>
            </div>
          </div>
        </div>

        <nav className="dashboard-nav flex-1 space-y-2 px-4 py-6">
          {navItems.map(([item, icon]) => (
            <button
              key={item}
              onClick={() => selectView(item)}
              className={`dashboard-nav-item flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                activeView === item ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span className="dashboard-nav-icon" aria-hidden="true">{icon}</span>
              <span className="flex-1">{item}</span>
              {activeView === item && <span className="dashboard-nav-arrow" aria-hidden="true">›</span>}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="dashboard-profile flex items-center gap-3 border-t border-white/10 px-2 py-4">
            <div className="dashboard-avatar">{avatarInitials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-slate-400">{isAdmin ? "Admin" : "User"}</p>
            </div>
            <span className="text-sm" aria-hidden="true">⌄</span>
          </div>
          <button
            onClick={onLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="dashboard-mobile-drawer h-full w-72 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <div className="h-5 w-5 rounded-full border-2 border-white/80" />
                </div>

                <div>
                  <p className="font-bold text-sm">OneCrore CRM</p>
                </div>
              </div>
            </div>

            <nav className="space-y-2 px-4 py-5">
              {navItems.map(([item, icon]) => (
                <button
                  key={item}
                  className={`dashboard-nav-item flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    activeView === item ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                  onClick={() => selectView(item)}
                >
                  <span className="dashboard-nav-icon" aria-hidden="true">{icon}</span><span>{item}</span>
                </button>
              ))}
            </nav>

            <div className="border-t border-white/10 p-4">
              <button
                onClick={onLogout}
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="dashboard-main lg:pl-64">
        <header className="dashboard-header sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-lg text-slate-700 lg:hidden"
                aria-label="Open navigation"
              >
                ≡
              </button>

              <div className="dashboard-heading min-w-0">
                <h1 className="truncate text-2xl font-bold text-slate-950 sm:text-3xl">{activeView}</h1>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Manage customer information and activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="appearance-control">
                <button type="button" onClick={() => setAppearanceOpen((value) => !value)} className="appearance-trigger" aria-label="Choose appearance" aria-expanded={appearanceOpen}>☼</button>
                {appearanceOpen && (
                  <div className="appearance-popover">
                    <div className="appearance-popover-heading"><p>Appearance</p><span>Choose the interface palette.</span></div>
                    {APPEARANCE_OPTIONS.map(([value, icon, label, description]) => (
                      <button key={value} type="button" onClick={() => { onThemeChange(value); setAppearanceOpen(false); }} className={`appearance-option ${theme === value ? "appearance-option-active" : ""}`}>
                        <span className="appearance-option-icon">{icon}</span>
                        <span className="appearance-option-copy"><strong>{label}</strong><small>{description}</small></span>
                        <span className="appearance-option-dot" />
                      </button>
                    ))}
                    <div className="appearance-popover-footer">Saved automatically on this device.</div>
                  </div>
                )}
              </div>

              {isAdmin && (isCustomerSearchView || activeView === "Campaigns") && (
                <button
                  onClick={openAddCustomer}
                  className="dashboard-add-customer rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 sm:px-4 sm:py-2.5 sm:text-sm"
                  aria-label="Add customer"
                  title="Add customer"
                >
                  + Add Customer
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-content p-4 sm:p-6 lg:p-8">
          {activeView === "Import Customers" && isAdmin ? (
            <CustomerImport />
          ) : activeView === "Customers" && isAdmin ? (
            <AdminUsers />
          ) : activeView === "Reports" && isAdmin ? (
            <LoginReports />
          ) : activeView === "Campaigns" && isAdmin ? (
            <Campaigns demoMode={demoMode} onAddCustomer={openAddCustomer} />
          ) : activeView === "Plans" && isAdmin ? (
            <Plans />
          ) : activeView === "Settings" ? (
            <Settings user={user} theme={theme} onThemeChange={onThemeChange} onUserUpdate={onUserUpdate} onLogout={onLogout} demoMode={demoMode} />
          ) : activeView === "Follow-ups" ? (
            <FollowUps apiFetch={apiFetch} apiBaseUrl={API_BASE_URL} demoMode={demoMode} />
          ) : isCustomerSearchView ? (
          <>
          {apiError && (
            <div className="dashboard-alert mb-5 flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 text-sm">
              <div className="dashboard-alert-icon">↗</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Backend API Connection Issue</p>
                <p className="mt-1 break-words">{apiError}</p>
              </div>
              <button onClick={() => void searchCustomers()} className="dashboard-alert-button rounded-xl px-4 py-2 font-semibold">
                Retry Search
              </button>
            </div>
          )}

          <div className="dashboard-customers mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-950"><span className="dashboard-section-icon">♧</span>Customers</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search customer records
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="customer-search-field">Search field</label>
                <select
                  id="customer-search-field"
                  value={searchField}
                  onChange={(event) => setSearchField(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="auto">Name or phone</option>
                  <option value="name">Customer name</option>
                  <option value="phone">Phone number</option>
                </select>
                <label className="sr-only" htmlFor="customer-search-query">Search customers</label>
                <input
                  id="customer-search-query"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  inputMode={searchField === "phone" ? "tel" : "search"}
                  autoComplete="off"
                  placeholder={
                    searchField === "auto"
                      ? "Search by name or phone"
                      : searchField === "phone"
                        ? "Enter at least 3 digits"
                        : "Enter at least 2 characters"
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 sm:w-72"
                />

              </div>
            </div>

            {loading ? (
              <div className="px-6 py-14 text-center">
                <p className="font-semibold text-slate-700">Loading customers...</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Customer Name",
                          "Customer Number",
                          "Customer Address",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="transition hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">{customer.name}</p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {customer.phone || "-"}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {customer.address || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-4 md:hidden">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{customer.name}</p>
                          <p className="text-sm text-slate-500">{customer.phone || "Phone unavailable"}</p>
                        </div>

                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>
                          <span className="font-medium text-slate-700">Customer Number:</span>{" "}
                          {customer.phone || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Customer Address:</span>{" "}
                          {customer.address || "-"}
                        </p>
                      </div>

                    </div>
                  ))}
                </div>

                {!loading && hasSearched && customers.length === 0 && (
                  <div className="px-6 py-14 text-center">
                    <p className="font-semibold text-slate-700">No customers found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try a different customer name or phone number.
                    </p>
                  </div>
                )}
                {!loading && !hasSearched && (
                  <div className="px-6 py-14 text-center">
                    <p className="font-semibold text-slate-700">Search by customer name or phone number</p>
                    <p className="mt-1 text-sm text-slate-500">Customer addresses are displayed in results but are not searchable.</p>
                  </div>
                )}
                {!loading && nextCursor && (
                  <div className="border-t border-slate-100 px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => void searchCustomers({ cursor: nextCursor, append: true })}
                      className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Load more results
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">{activeView}</h2>
              <p className="mt-2 text-sm text-slate-500">
                This feature is not available yet. Use Dashboard to search customer records.
              </p>
              <button
                type="button"
                onClick={() => selectView("Dashboard")}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open Dashboard
              </button>
            </div>
          )}
        </div>
      </main>

      {showForm && isAdmin && (
        <CustomerForm
          customer={editingCustomer}
          saving={saving}
          onSave={saveCustomer}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
        />
      )}

          {selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          deleting={deleting}
          onDelete={() => deleteCustomer(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          onEdit={() => {
            openEditCustomer(selectedCustomer);
            setSelectedCustomer(null);
          }}
        />
          )}
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(isDemoMode || Boolean(authToken));
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(
    isDemoMode ? { name: "Demo User", email: "demo@example.com", role: "user" } : null
  );
  const [recoveryToken, setRecoveryToken] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return hash.get("type") === "recovery" ? hash.get("access_token") : "";
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("onecrore-theme") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    document.documentElement.classList.toggle("theme-night", theme === "night");
    localStorage.setItem("onecrore-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!authToken) return;
    apiFetch(`${API_BASE_URL}/auth/me`)
      .then(async (response) => {
        if (!response.ok) return;
        const user = await response.json();
        setCurrentUser(user);
        setIsAdmin(user.role === "admin");
      })
      .catch(() => undefined);
  }, []);

  if (recoveryToken) {
    return (
      <PasswordRecovery
        accessToken={recoveryToken}
        onComplete={() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setRecoveryToken("");
        }}
      />
    );
  }

  return loggedIn ? (
    <Dashboard
      theme={theme}
      isAdmin={isAdmin}
      user={currentUser}
      demoMode={isDemoMode}
      onThemeChange={setTheme}
      onUserUpdate={(updatedUser) => {
        setCurrentUser((existingUser) => ({ ...existingUser, ...updatedUser }));
      }}
      onLogout={() => {
        setAuthToken("");
        setLoggedIn(false);
        setIsAdmin(false);
        setCurrentUser(null);
      }}
    />
  ) : (
    <Login
      onLogin={(user) => {
        setCurrentUser(user);
        setIsAdmin(user.role === "admin");
        setLoggedIn(true);
      }}
    />
  );
}

export default App;
