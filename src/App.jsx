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

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name || !form.email) return;

    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
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
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option>Active</option>
              <option>Follow-up</option>
              <option>Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Save Customer
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
          <h2 className="text-xl font-bold">Customer Details</h2>
        </div>

        <div className="space-y-4 p-6">
          {[
            ["Customer ID", customer.id],
            ["Name", customer.name],
            ["Email", customer.email],
            ["Phone", customer.phone],
            ["Company", customer.company],
            ["Status", customer.status],
            ["Last Contact", customer.lastContact],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Close
          </button>

          <button
            onClick={onEdit}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Edit Customer
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
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
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === editingCustomer.id
            ? { ...customer, ...form }
            : customer
        )
      );
    } else {
      const newCustomer = {
        ...form,
        id: `CUS-${1000 + customers.length + 1}`,
        lastContact: "New",
      };

      setCustomers((prev) => [newCustomer, ...prev]);
    }

    setShowForm(false);
    setEditingCustomer(null);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <p className="font-bold">Customer Management</p>
          <p className="text-xs text-slate-400">OneCrore Data Plus</p>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {["Dashboard", "Customers", "Follow-ups", "Reports", "Settings"].map(
            (item, index) => (
              <button
                key={item}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm ${
                  index === 0
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {item}
              </button>
            )
          )}
        </nav>
      </aside>

      <main className="lg:pl-64">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-6 py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold">Dashboard</h1>
              <p className="text-sm text-slate-500">
                Manage customer information and activity
              </p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              + Add Customer
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Customers</p>
              <p className="mt-3 text-3xl font-bold">{customers.length}</p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Active Customers</p>
              <p className="mt-3 text-3xl font-bold">
                {customers.filter((c) => c.status === "Active").length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Follow-ups</p>
              <p className="mt-3 text-3xl font-bold">
                {customers.filter((c) => c.status === "Follow-up").length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Inactive</p>
              <p className="mt-3 text-3xl font-bold">
                {customers.filter((c) => c.status === "Inactive").length}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold">Customers</h2>
                <p className="text-sm text-slate-500">
                  Search, view and edit customer records
                </p>
              </div>

              <div className="flex gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="rounded-xl border border-slate-300 px-4 py-2.5"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5"
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
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{customer.name}</p>
                        <p className="text-sm text-slate-500">
                          {customer.email}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {customer.company}
                      </td>

                      <td className="px-5 py-4 text-sm">{customer.phone}</td>

                      <td className="px-5 py-4 text-sm">{customer.status}</td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-sm font-semibold text-blue-600"
                        >
                          View
                        </button>

                        <button
                          onClick={() => {
                            setEditingCustomer(customer);
                            setShowForm(true);
                          }}
                          className="ml-4 text-sm font-semibold text-slate-600"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            setEditingCustomer(selectedCustomer);
            setSelectedCustomer(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}

function App() {
  return <Dashboard />;
}

export default App;