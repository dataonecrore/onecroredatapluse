import { useState } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");

    // Temporary frontend-only login.
    // Later we will connect this to FastAPI + Supabase.
    alert("Login submitted successfully.");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
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

            <div className="mt-24 max-w-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                Customer Intelligence
              </p>

              <h2 className="mt-5 text-5xl font-bold leading-tight">
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
            <div className="lg:hidden mb-10">
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
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700"
                  >
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
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-20 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
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
                className="w-full rounded-xl bg-slate-950 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                Sign in
              </button>
            </form>

            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="text-center text-sm text-slate-400">
                Customer Management System
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;