import { useMemo, useState } from "react";

const initialCustomers = [
  {
    id: "CUS-1001",
    name: "Ananya Rao",
    email: "ananya@company.com",
    phone: "+91 98765 43210",
    company: "Aster Labs",
    status: "Active",
    lastContact: "Today",
  },
  {
    id: "CUS-1002",
    name: "Rahul Verma",
    email: "rahul@northstar.in",
    phone: "+91 99887 66554",
    company: "Northstar Retail",
    status: "Follow-up",
    lastContact: "Yesterday",
  },
  {
    id: "CUS-1003",
    name: "Meera Shah",
    email: "meera@finovo.in",
    phone: "+91 91234 56789",
    company: "Finovo",
    status: "Active",
    lastContact: "2 days ago",
  },
];

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    onLogin();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-12 text-white">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold">
                CM
              </div>

              <div>
                <h1 className="text-xl font-semibold">Customer Management</h1>
                <p className="text-sm text-blue-200">OneCrore Data Plus</p>
              </div>
            </div>

            <div className="mt-20 max-w-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                Customer Intelligence
              </p>

              <h2 className="mt-5 text-4xl xl:text-5xl font-bold leading-tight">
                Manage every customer relationship from one place.
              </h2>

              <p className="mt-6 text-lg text-slate-300 leading-8">
                Search customers, maintain records, track activity, and manage
                your customer database through a clean and secure workspace.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            Secure customer management platform
          </p>
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8">
              <div className="h-12 w-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-bold">
                CM
              </div>
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Welcome back
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Sign in to your account
            </h2>

            <p className="mt-3 text-slate-500">
              Enter your credentials to access the customer management system.
            </p>

            <form className="mt-10 space-y-6" onSubmit={handleLogin}>
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
                <div className="flex items-center justify-between">
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

function CustomerForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState(
    customer || {
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "Active",
    }
  );

  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      setError("Customer name and email are required.");
      return;
    }

    setError("");
    onSave(form);
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
              value={form.name}
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
              value={form.email}
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
              value={form.phone}
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
              value={form.company}
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
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
            >
              <option>Active</option>
              <option>Follow-up</option>
              <option>Inactive</option>
            </select>
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
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {customer ? "Update Customer" : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerDetails({ customer, onEdit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">
            Customer Details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            View customer information.
          </p>
        </div>

        <div className="space-y-4 p-6">
          {[
            ["Customer ID", customer.id],
            ["Name", customer.name],
            ["Email", customer.email],
            ["Phone", customer.phone || "-"],
            ["Company", customer.company || "-"],
            ["Status", customer.status],
            ["Last Contact", customer.lastContact],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
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

function Dashboard({ onLogout }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = [
        customer.name,
        customer.email,
        customer.company,
        customer.phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const saveCustomer = (form) => {
    if (editingCustomer) {
      setCustomers((previous) =>
        previous.map((customer) =>
          customer.id === editingCustomer.id
            ? {
                ...customer,
                ...form,
              }
            : customer
        )
      );
    } else {
      const existingIds = customers.map((customer) => {
        const numericPart = Number(customer.id.replace("CUS-", ""));
        return Number.isNaN(numericPart) ? 1000 : numericPart;
      });

      const nextId = Math.max(1000, ...existingIds) + 1;

      const newCustomer = {
        ...form,
        id: `CUS-${nextId}`,
        lastContact: "New",
      };

      setCustomers((previous) => [newCustomer, ...previous]);
    }

    setShowForm(false);
    setEditingCustomer(null);
  };

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const openEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 font-bold">
              CM
            </div>

            <div>
              <p className="font-bold">Customer Management</p>
              <p className="text-xs text-slate-400">OneCrore Data Plus</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {[
            "Dashboard",
            "Customers",
            "Follow-ups",
            "Reports",
            "Settings",
          ].map((item, index) => (
            <button
              key={item}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                index === 0
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-white/5"
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

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 px-6 py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-950">Dashboard</h1>

              <p className="text-sm text-slate-500">
                Manage customer information and activity
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openAddCustomer}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Add Customer
              </button>

              <button
                onClick={onLogout}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 lg:hidden"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total Customers
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-950">
                {customers.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Active Customers
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-950">
                {customers.filter((c) => c.status === "Active").length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Follow-ups
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-950">
                {customers.filter((c) => c.status === "Follow-up").length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Inactive</p>

              <p className="mt-3 text-3xl font-bold text-slate-950">
                {customers.filter((c) => c.status === "Inactive").length}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Customers</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Search, view and edit customer records
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 sm:w-72"
                />

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
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Customer",
                      "Company",
                      "Phone",
                      "Status",
                      "Last Contact",
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
                    <tr
                      key={customer.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {customer.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          {customer.email}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {customer.company || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {customer.phone || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            customer.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : customer.status === "Follow-up"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {customer.lastContact}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>

                        <button
                          onClick={() => openEditCustomer(customer)}
                          className="ml-4 text-sm font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCustomers.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <p className="font-semibold text-slate-700">
                    No customers found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or status filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
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
  const [loggedIn, setLoggedIn] = useState(false);

  return loggedIn ? (
    <Dashboard onLogout={() => setLoggedIn(false)} />
  ) : (
    <Login onLogin={() => setLoggedIn(true)} />
  );
}

export default App;