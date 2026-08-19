import { useState } from 'react'

const Icon = ({ children, className = '' }) => (
  <span className={`inline-flex items-center justify-center ${className}`}>{children}</span>
)

function App() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-14">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg shadow-black/20">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 7.5A3.5 3.5 0 1 0 7 14a3.5 3.5 0 0 0 0-7Z" />
                <path d="M14.5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                <path d="M2.8 20c.7-3.1 2.6-4.7 5.7-4.7s5 1.6 5.7 4.7" />
                <path d="M13.1 16.2c2.8-.4 5 .8 6.1 3.8" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Customer</p>
              <p className="text-lg font-semibold tracking-tight">Management System</p>
            </div>
          </div>

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur">
              Built for faster customer operations
            </span>
            <h1 className="mt-7 text-5xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-6xl">
              Keep every customer relationship clear, organized, and actionable.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Manage customer records, follow-ups, account activity, and team workflows from one secure workspace.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
              {[
                ['360°', 'Customer view'],
                ['Fast', 'Search & filters'],
                ['Secure', 'Role-based access'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm">
                  <p className="text-xl font-semibold">{value}</p>
                  <p className="mt-1 text-sm text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-sm text-slate-500">© 2026 Customer Management System</p>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8 lg:px-12">
          <div className="absolute left-5 top-5 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 7.5A3.5 3.5 0 1 0 7 14a3.5 3.5 0 0 0 0-7Z" />
                <path d="M14.5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                <path d="M2.8 20c.7-3.1 2.6-4.7 5.7-4.7s5 1.6 5.7 4.7" />
                <path d="M13.1 16.2c2.8-.4 5 .8 6.1 3.8" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900">Customer Management</p>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-semibold text-indigo-600">Welcome back</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Sign in to your account</h2>
              <p className="mt-3 text-base leading-7 text-slate-500">
                Enter your credentials to access the customer management dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <Icon className="pointer-events-none absolute inset-y-0 left-0 w-12 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m4 7 8 6 8-6" />
                    </svg>
                  </Icon>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <button type="button" className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Icon className="pointer-events-none absolute inset-y-0 left-0 w-12 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="5" y="10" width="14" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </Icon>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M3 3l18 18" />
                        <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
                        <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4.2 9.5 6-.5.9-1.7 2.6-3.5 4" />
                        <path d="M6.6 6.6C4.5 8 3.1 10 2.5 11c1 1.8 4.5 6 9.5 6a10 10 0 0 0 3-.5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                Keep me signed in on this device
              </label>

              <button
                type="submit"
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-[15px] font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
              >
                Sign in
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                  <path d="m14 7 5 5-5 5" />
                </svg>
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3 4.5 6v5c0 4.7 3.2 8.4 7.5 10 4.3-1.6 7.5-5.3 7.5-10V6L12 3Z" />
                    <path d="m9.5 12 1.5 1.5 3.5-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Secure access</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Authentication will be connected to FastAPI and Supabase in the backend stage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
