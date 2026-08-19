import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://onecroredatapluse-production.up.railway.app";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    onLogin(role);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-6xl grid overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-12 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <div className="h-6 w-6 rounded-full border-2 border-white/80" />
              </div>

              <div>
                <h1 className="text-xl font-semibold">OneCrore CRM</h1>
                <p className="text-sm text-blue-200">OneCrore Plus Data</p>
              </div>
            </div>

            <div className="mt-20 max-w-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                Customer Intelligence
              </p>

              <h2 className="mt-5 text-4xl font-bold leading-tight xl:text-5xl">
                Manage every customer relationship from one place.
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-300">
                Search customers, maintain records, track activity, and manage your customer database through a clean and secure workspace.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-400">Secure customer management platform</p>
        </div>

        <div className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-16 lg:py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <div className="h-5 w-5 rounded-full border-2 border-white/80" />
              </div>
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Welcome back
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Sign in to your account
            </h2>

            <p className="mt-3 text-slate-500">
              Enter your credentials to access OneCrore CRM.
            </p>

            <form className="mt-8 space-y-6 sm:mt-10" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3.5 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3.5 pr-20 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-4 text-sm font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Account type
                </label>

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="user">User - view and copy</option>
                  <option value="admin">Admin - full access</option>
                </select>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                Remember me
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-950 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-700"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>
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
      company: "",
      status: "Active",
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
        company: form.company || "",
        status: form.status || "Active",
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
              Company
            </label>

            <input
              value={form.company || ""}
              onChange={(e) => updateField("company", e.target.value)}
              placeholder="Company name"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Status
            </label>

            <select
              value={form.status || "Active"}
              onChange={(e) => updateField("status", e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
            >
              <option>Active</option>
              <option>Follow-up</option>
              <option>Inactive</option>
            </select>
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

function CustomerDetails({ customer, onEdit, onClose, onDelete, deleting, isAdmin }) {
  const [copied, setCopied] = useState(false);

  const copyCustomer = async () => {
    const customerText = [
      `Name: ${customer.name || "-"}`,
      `Phone: ${customer.phone || "-"}`,
      `Email: ${customer.email || "-"}`,
      `Company: ${customer.company || "-"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(customerText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy customer details:", customerText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">Customer Details</h2>
          <p className="mt-1 text-sm text-slate-500">View customer information.</p>
        </div>

        <div className="space-y-4 p-6">
          {[
            ["Customer ID", customer.id],
            ["Name", customer.name],
            ["Email", customer.email],
            ["Phone", customer.phone || "-"],
            ["Company", customer.company || "-"],
            ["Status", customer.status],
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
            onClick={copyCustomer}
            className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            {copied ? "Copied" : "Copy Customer"}
          </button>

          {isAdmin && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          {isAdmin && (
            <button
              onClick={onEdit}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Edit Customer
            </button>
          )}
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

      const response = await fetch(`${API_BASE_URL}/imports/customers`, {
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
        const statusResponse = await fetch(`${API_BASE_URL}/imports/${currentJob.id}`);

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
          <span className="mt-1 text-sm text-slate-500">CSV or XLSX, up to 100 MB</span>
          <input
            type="file"
            accept=".csv,.xlsx"
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
                {job.processed.toLocaleString()} rows checked, {job.invalid.toLocaleString()} invalid.
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

function Dashboard({ onLogout, role, theme, onThemeChange }) {
  const isAdmin = role === "admin";
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState("Dashboard");

  const loadCustomers = async () => {
    setLoading(true);
    setApiError("");

    try {
      const response = await fetch(`${API_BASE_URL}/customers`);

      if (!response.ok) {
        throw new Error("Unable to load customers.");
      }

      const data = await response.json();
      setCustomers(data);
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
      const matchesSearch = String(customer.phone || "")
        .toLowerCase()
        .includes(phoneSearch.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, phoneSearch, statusFilter]);

  const handlePhoneSearch = (event) => {
    event.preventDefault();
    setPhoneSearch(search.trim());
  };

  const saveCustomer = async (form) => {
    if (!isAdmin) return;

    setSaving(true);
    setApiError("");

    try {
      const isEditing = Boolean(editingCustomer);

      const response = await fetch(
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
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Delete ${customer.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setApiError("");

    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
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

  const exportCustomers = () => {
    if (!isAdmin || filteredCustomers.length === 0) return;

    const columns = ["name", "phone"];
    const csvRows = [
      ["Customer Name", "Phone Number"],
      ...filteredCustomers.map((customer) =>
        columns.map((column) => {
          const value = String(customer[column] || "");
          return `"${value.replaceAll('"', '""')}"`;
        })
      ),
    ];
    const csv = csvRows.map((row) => row.join(",")).join("\n");
    const downloadUrl = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "onecrore-customers.csv";
    link.click();
    URL.revokeObjectURL(downloadUrl);
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
    ? ["Dashboard", "Customers", "Import Customers", "Follow-ups", "Reports", "Settings"]
    : ["Dashboard", "Customers", "Follow-ups", "Reports"];

  const selectView = (item) => {
    setActiveView(item);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10">
              <div className="h-5 w-5 rounded-full border-2 border-white/80" />
            </div>

            <div>
              <p className="font-bold">OneCrore CRM</p>
              <p className="text-xs text-slate-400">OneCrore Plus Data</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => selectView(item)}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                activeView === item ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {item}
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

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="h-full w-72 bg-slate-950 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <div className="h-5 w-5 rounded-full border-2 border-white/80" />
                </div>

                <div>
                  <p className="font-bold text-sm">OneCrore CRM</p>
                  <p className="text-[11px] text-slate-400">OneCrore Plus Data</p>
                </div>
              </div>
            </div>

            <nav className="space-y-2 px-4 py-5">
              {navItems.map((item) => (
                <button
                  key={item}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    activeView === item ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                  onClick={() => selectView(item)}
                >
                  {item}
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

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-lg text-slate-700 lg:hidden"
                aria-label="Open navigation"
              >
                ?
              </button>

              <div>
                <h1 className="text-lg font-bold text-slate-950 sm:text-xl">{activeView}</h1>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Manage customer information and activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onThemeChange(theme === "light" ? "dark" : theme === "dark" ? "night" : "light")}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark-mode-control"
                aria-label={`Current theme: ${theme}. Switch theme`}
              >
                {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Night"}
              </button>

              {isAdmin && (
                <button
                  onClick={openAddCustomer}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  + Add Customer
                </button>
              )}

              <button
                onClick={onLogout}
                className="hidden rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 sm:inline-flex"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {activeView === "Import Customers" ? (
            <CustomerImport />
          ) : (
          <>
          {apiError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Customers</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search, view and edit customer records
                </p>
              </div>

              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handlePhoneSearch}>
                <input
                  type="tel"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by phone number..."
                  aria-label="Search by phone number"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 sm:w-72"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Search
                </button>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none"
                >
                  <option>All</option>
                  <option>Active</option>
                  <option>Follow-up</option>
                  <option>Inactive</option>
                </select>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={exportCustomers}
                    disabled={filteredCustomers.length === 0}
                    className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                )}
              </form>
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
                          "Phone Number",
                          "Action",
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
                            {customer.phone || "-"}
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedCustomer(customer)}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => openEditCustomer(customer)}
                                className="ml-4 text-sm font-semibold text-slate-600 hover:text-slate-900"
                              >
                                Edit
                              </button>
                            )}
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
                          <p className="mt-1 text-sm text-slate-600">{customer.phone || "-"}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white"
                        >
                          View
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => openEditCustomer(customer)}
                            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredCustomers.length === 0 && (
                  <div className="px-6 py-14 text-center">
                    <p className="font-semibold text-slate-700">No customers found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search or status filter.
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

      {showForm && (
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
          isAdmin={isAdmin}
          deleting={deleting}
          onDelete={() => isAdmin && deleteCustomer(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          onEdit={() => {
            if (!isAdmin) return;
            openEditCustomer(selectedCustomer);
            setSelectedCustomer(null);
          }}
        />
          )}
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState("user");
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("onecrore-theme");
    return ["light", "dark", "night"].includes(savedTheme) ? savedTheme : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    document.documentElement.classList.toggle("theme-night", theme === "night");
    localStorage.setItem("onecrore-theme", theme);
  }, [theme]);

  return loggedIn ? (
    <Dashboard
      role={role}
      theme={theme}
      onThemeChange={setTheme}
      onLogout={() => setLoggedIn(false)}
    />
  ) : (
    <Login
      onLogin={(selectedRole) => {
        setRole(selectedRole);
        setLoggedIn(true);
      }}
    />
  );
}

export default App;
