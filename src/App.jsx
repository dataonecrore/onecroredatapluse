import { useEffect, useMemo, useState } from "react";

const PUBLIC_API_BASE_URL = "https://onecroredatapluse-production.up.railway.app";
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isLoopbackApi = configuredApiBaseUrl
  ? /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/.test(configuredApiBaseUrl)
  : false;
const API_BASE_URL =
  import.meta.env.PROD && isLoopbackApi
    ? PUBLIC_API_BASE_URL
    : configuredApiBaseUrl || PUBLIC_API_BASE_URL;

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
      address: "",
      notes: "",
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

    if (!form.name?.trim() || !form.email?.trim()) {
      setError("Customer name and email are required.");
      return;
    }

    setError("");

    try {
      await onSave({
        name: form.name,
        email: form.email,
        phone: form.phone || "",
        address: form.address || "",
        notes: form.notes || "",
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
              Email
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
              Phone
            </label>

            <input
              value={form.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+91 98765 43210"
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
            ["Email", customer.email],
            ["Phone", customer.phone || "-"],
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
          Stage a CSV or Excel file for validation before it enters the customer database.
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
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{job.filename}</p>
                <p className="mt-1 text-sm text-slate-600">{job.message}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-blue-700">
                {job.status}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
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
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    const response = await apiFetch(`${API_BASE_URL}/auth/users`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Unable to load users.");
    setUsers(data);
  };

  useEffect(() => {
    loadUsers().catch((loadError) => setError(loadError.message));
  }, []);

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
      setMessage(`Invitation sent to ${data.email}.`);
      await loadUsers();
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

  return (
    <div className="dashboard-customers overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-2xl font-bold text-slate-950">User Access</h2>
        <p className="mt-1 text-sm text-slate-500">Invite users and control access to customer data.</p>
      </div>
      <form onSubmit={inviteUser} className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row">
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@company.com" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-600" />
        <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-2.5">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Invite User</button>
      </form>
      {(message || error) && <p className={`px-5 py-3 text-sm ${error ? "text-red-600" : "text-emerald-600"}`}>{error || message}</p>}
      <div className="divide-y divide-slate-100">
        {users.map((user) => (
          <div key={user.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-slate-900">{user.email}</span>
            <select value={user.role} onChange={(event) => updateRole(user.id, event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-32">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ onLogout, theme, onThemeChange, isAdmin }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState("Dashboard");
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setApiError("");

    try {
      const response = await apiFetch(`${API_BASE_URL}/customers`);

      if (!response.ok) {
        throw new Error("Unable to load customers.");
      }

      const data = await response.json();
      setCustomers(data);
      setApiError("");
    } catch (error) {
      setApiError(
        error instanceof TypeError
          ? `Unable to connect to the backend at ${API_BASE_URL}. Check that the API is running and that VITE_API_BASE_URL points to its public URL.`
          : error.message || "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const isPlaceholderCustomer =
        customer.name?.trim().toLowerCase() === "string" &&
        customer.email?.trim().toLowerCase() === "user@example.com" &&
        customer.phone?.trim().toLowerCase() === "string" &&
        customer.company?.trim().toLowerCase() === "string";

      if (isPlaceholderCustomer) return false;

      const matchesSearch = [
        customer.name,
        customer.email,
        customer.phone,
        customer.id,
        customer.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesSearch;
    });
  }, [customers, search]);

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

      await loadCustomers();
      setShowForm(false);
      setEditingCustomer(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (customer) => {
    const confirmed = window.confirm(
      `Delete ${customer.name}? This action cannot be undone.`
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
      await loadCustomers();
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
        ["Settings", "⚙"],
      ]
    : [
        ["Dashboard", "▦"],
        ["Follow-ups", "□"],
        ["Settings", "⚙"],
      ];

  const selectView = (item) => {
    setActiveView(item);
    setMobileMenuOpen(false);
  };

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
            <div className="dashboard-avatar">BT</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Biksham Tarala</p>
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
                    {[
                      ["light", "☼", "Light", "Bright and clean"],
                      ["dark", "☾", "Dark", "Neutral charcoal"],
                      ["night", "✧", "Night", "Deep navy"],
                    ].map(([value, icon, label, description]) => (
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

              {isAdmin && (
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
          ) : activeView === "Settings" && isAdmin ? (
            <AdminUsers />
          ) : (
          <>
          {apiError && (
            <div className="dashboard-alert mb-5 flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 text-sm">
              <div className="dashboard-alert-icon">↗</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Backend API Connection Issue</p>
                <p className="mt-1 break-words">{apiError}</p>
              </div>
              <button onClick={loadCustomers} className="dashboard-alert-button rounded-xl px-4 py-2 font-semibold">
                Retry Connection
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
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
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
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="transition hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">{customer.name}</p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {customer.id || "-"}
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
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{customer.name}</p>
                          <p className="text-sm text-slate-500">{customer.email}</p>
                        </div>

                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>
                          <span className="font-medium text-slate-700">Customer Number:</span>{" "}
                          {customer.id || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Customer Address:</span>{" "}
                          {customer.address || "-"}
                        </p>
                      </div>

                    </div>
                  ))}
                </div>

                {filteredCustomers.length === 0 && (
                  <div className="px-6 py-14 text-center">
                    <p className="font-semibold text-slate-700">No customers found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          </>
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
  const [loggedIn, setLoggedIn] = useState(Boolean(authToken));
  const [isAdmin, setIsAdmin] = useState(false);
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
    apiFetch(`${API_BASE_URL}/auth/users`).then((response) => {
      if (response.status === 403) setIsAdmin(false);
      else if (response.ok) setIsAdmin(true);
    }).catch(() => undefined);
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
      onThemeChange={setTheme}
      onLogout={() => {
        setAuthToken("");
        setLoggedIn(false);
        setIsAdmin(false);
      }}
    />
  ) : (
    <Login
      onLogin={({ role }) => {
        setIsAdmin(role === "admin");
        setLoggedIn(true);
      }}
    />
  );
}

export default App;
