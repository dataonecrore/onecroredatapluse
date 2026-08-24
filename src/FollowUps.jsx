import { useEffect, useState } from "react";


const FILTERS = [
  ["upcoming", "Upcoming"],
  ["overdue", "Overdue"],
  ["completed", "Completed"],
  ["all", "All"],
];

const CHANNELS = [
  ["call", "Phone call"],
  ["meeting", "Meeting"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
  ["other", "Other"],
];

const PRIORITIES = [
  ["low", "Low"],
  ["normal", "Normal"],
  ["high", "High"],
  ["urgent", "Urgent"],
];

const priorityClasses = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  normal: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

function defaultDueAt() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toLocalInput(value) {
  if (!value) return defaultDueAt();
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function newForm() {
  return {
    subject: "",
    notes: "",
    due_at: defaultDueAt(),
    priority: "normal",
    channel: "call",
  };
}

function FollowUpForm({
  editing,
  form,
  setForm,
  selectedCustomer,
  setSelectedCustomer,
  customerQuery,
  setCustomerQuery,
  customerResults,
  customerSearching,
  onSearchCustomers,
  onSave,
  onClose,
  saving,
  error,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-5 sm:px-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{editing ? "Edit follow-up" : "New follow-up"}</h2>
            <p className="mt-1 text-sm text-slate-500">Schedule the next customer action and keep its outcome visible.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-3 py-1.5 text-xl text-slate-500 hover:bg-slate-100" aria-label="Close follow-up form">x</button>
        </div>

        <form onSubmit={onSave} className="space-y-5 p-5 sm:p-6">
          <div>
            <label className="text-sm font-semibold text-slate-700">Customer</label>
            {selectedCustomer ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{selectedCustomer.name}</p>
                  <p className="truncate text-sm text-slate-500">{selectedCustomer.phone || selectedCustomer.email || "Contact details unavailable"}</p>
                </div>
                {!editing && <button type="button" onClick={() => setSelectedCustomer(null)} className="text-sm font-semibold text-blue-700">Change</button>}
              </div>
            ) : (
              <div className="mt-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSearchCustomers();
                      }
                    }}
                    placeholder="Search customer name or phone"
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                  <button type="button" onClick={onSearchCustomers} disabled={customerSearching} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                    {customerSearching ? "Searching..." : "Search"}
                  </button>
                </div>
                {customerResults.length > 0 && (
                  <div className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => setSelectedCustomer(customer)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{customer.name}</strong><small className="block truncate text-slate-500">{customer.phone || customer.email || "No contact details"}</small></span>
                        <span className="text-sm font-semibold text-blue-600">Select</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="follow-up-subject">Subject</label>
            <input id="follow-up-subject" required maxLength={160} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Example: Confirm renewal decision" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="follow-up-due">Due date and time</label>
              <input id="follow-up-due" required type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="follow-up-channel">Contact method</label>
              <select id="follow-up-channel" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
                {CHANNELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="follow-up-priority">Priority</label>
            <select id="follow-up-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 sm:w-56">
              {PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="follow-up-notes">Notes</label>
            <textarea id="follow-up-notes" rows={4} maxLength={5000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add context, promised actions, or talking points" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving || !selectedCustomer} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Save changes" : "Create follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FollowUps({ apiFetch, apiBaseUrl, demoMode = false }) {
  const [filter, setFilter] = useState("upcoming");
  const [items, setItems] = useState([]);
  const [nextOffset, setNextOffset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(newForm);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadFollowUps = async ({ append = false, offset = 0 } = {}) => {
    if (demoMode) {
      setItems([]);
      setNextOffset(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ state: filter, limit: "50", offset: String(offset) });
      const response = await apiFetch(`${apiBaseUrl}/follow-ups?${params}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Unable to load follow-ups.");
      setItems((current) => append ? [...current, ...data.items] : data.items);
      setNextOffset(data.next_offset);
    } catch (loadError) {
      setError(loadError.message || "Unable to load follow-ups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFollowUps();
  }, [filter, demoMode]);

  const openCreate = () => {
    setEditing(null);
    setForm(newForm());
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerResults([]);
    setError("");
    setShowForm(true);
  };

  const openEdit = (followUp) => {
    setEditing(followUp);
    setSelectedCustomer(followUp.customer);
    setForm({
      subject: followUp.subject,
      notes: followUp.notes || "",
      due_at: toLocalInput(followUp.due_at),
      priority: followUp.priority,
      channel: followUp.channel,
    });
    setError("");
    setShowForm(true);
  };

  const searchCustomers = async () => {
    const query = customerQuery.trim();
    const minimum = /\p{L}/u.test(query) ? 2 : 3;
    if (query.length < minimum) {
      setError(`Enter at least ${minimum} characters to search customers.`);
      return;
    }
    setCustomerSearching(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query, field: "auto", limit: "25" });
      const response = await apiFetch(`${apiBaseUrl}/customers/search?${params}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Unable to search customers.");
      setCustomerResults(data.items || []);
      if ((data.items || []).length === 0) setError("No matching customers were found.");
    } catch (searchError) {
      setError(searchError.message || "Unable to search customers.");
    } finally {
      setCustomerSearching(false);
    }
  };

  const saveFollowUp = async (event) => {
    event.preventDefault();
    if (!selectedCustomer) {
      setError("Select a customer before saving.");
      return;
    }
    const dueDate = new Date(form.due_at);
    if (Number.isNaN(dueDate.getTime())) {
      setError("Enter a valid due date and time.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(
        editing ? `${apiBaseUrl}/follow-ups/${editing.id}` : `${apiBaseUrl}/follow-ups`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            due_at: dueDate.toISOString(),
            ...(editing ? {} : { customer_id: selectedCustomer.id }),
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Unable to save the follow-up.");
      setShowForm(false);
      setMessage(editing ? "Follow-up updated." : "Follow-up created.");
      await loadFollowUps();
    } catch (saveError) {
      setError(saveError.message || "Unable to save the follow-up.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (followUp, status) => {
    setBusyId(followUp.id);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(`${apiBaseUrl}/follow-ups/${followUp.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Unable to update follow-up status.");
      setMessage(status === "completed" ? "Follow-up completed." : "Follow-up reopened.");
      await loadFollowUps();
    } catch (statusError) {
      setError(statusError.message || "Unable to update follow-up status.");
    } finally {
      setBusyId(null);
    }
  };

  const removeFollowUp = async (followUp) => {
    if (!window.confirm(`Delete "${followUp.subject}"? This action cannot be undone.`)) return;
    setBusyId(followUp.id);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(`${apiBaseUrl}/follow-ups/${followUp.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Unable to delete the follow-up.");
      setItems((current) => current.filter((item) => item.id !== followUp.id));
      setMessage("Follow-up deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete the follow-up.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="feature-surface feature-followups space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-700 to-indigo-800 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Customer activity</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Never miss the next conversation</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Schedule calls, meetings, messages, and emails against real customer records. Each user sees only their own follow-ups.</p>
          </div>
          <button type="button" onClick={openCreate} disabled={demoMode} className="min-h-11 shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">+ New follow-up</button>
        </div>
      </section>

      {demoMode && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Follow-ups require a signed-in account and are unavailable in demo mode.</p>}
      {(error || message) && <p className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}

      <section className="dashboard-customers overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="text-xl font-bold text-slate-950">Your follow-ups</h3>
            <p className="mt-1 text-sm text-slate-500">Organized by due date in your local time.</p>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Follow-up filters">
            {FILTERS.map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => { setFilter(value); setMessage(""); }} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${filter === value ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{label}</button>
            ))}
          </div>
        </div>

        {loading && items.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-slate-500">Loading follow-ups...</p>
        ) : items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-semibold text-slate-900">No {FILTERS.find(([value]) => value === filter)?.[1].toLowerCase()} follow-ups</p>
            <p className="mt-1 text-sm text-slate-500">Create one when a customer needs a future call, meeting, or message.</p>
            {!demoMode && <button type="button" onClick={openCreate} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Create follow-up</button>}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((followUp) => {
              const overdue = followUp.status === "open" && new Date(followUp.due_at).getTime() < Date.now();
              const customer = followUp.customer || {};
              return (
                <article key={followUp.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${priorityClasses[followUp.priority] || priorityClasses.normal}`}>{followUp.priority}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{followUp.channel}</span>
                        {overdue && <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">Overdue</span>}
                        {followUp.status === "completed" && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Completed</span>}
                      </div>
                      <h4 className="mt-3 text-lg font-bold text-slate-950">{followUp.subject}</h4>
                      <p className="mt-1 text-sm font-semibold text-blue-700">{customer.name || "Customer unavailable"}</p>
                      <p className="mt-1 text-sm text-slate-500">{customer.phone || customer.email || "Contact details unavailable"}</p>
                      {followUp.notes && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{followUp.notes}</p>}
                    </div>

                    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:w-60">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{followUp.status === "completed" ? "Completed" : "Due"}</p>
                      <p className={`mt-1 text-sm font-bold ${overdue ? "text-red-700" : "text-slate-900"}`}>{new Date(followUp.status === "completed" ? followUp.completed_at : followUp.due_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button type="button" onClick={() => changeStatus(followUp, followUp.status === "completed" ? "open" : "completed")} disabled={busyId === followUp.id} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{followUp.status === "completed" ? "Reopen" : "Mark complete"}</button>
                    <button type="button" onClick={() => openEdit(followUp)} disabled={busyId === followUp.id} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Edit</button>
                    <button type="button" onClick={() => removeFollowUp(followUp)} disabled={busyId === followUp.id} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">{busyId === followUp.id ? "Working..." : "Delete"}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {nextOffset !== null && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => loadFollowUps({ append: true, offset: nextOffset })} disabled={loading} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loading ? "Loading..." : "Load more"}</button></div>}
      </section>

      {showForm && (
        <FollowUpForm
          editing={editing}
          form={form}
          setForm={setForm}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={(customer) => { setSelectedCustomer(customer); if (customer) { setCustomerResults([]); setError(""); } }}
          customerQuery={customerQuery}
          setCustomerQuery={setCustomerQuery}
          customerResults={customerResults}
          customerSearching={customerSearching}
          onSearchCustomers={searchCustomers}
          onSave={saveFollowUp}
          onClose={() => { if (!saving) setShowForm(false); }}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}
