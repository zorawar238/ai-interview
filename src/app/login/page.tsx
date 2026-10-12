import { login, signup } from './actions'

export default async function LoginPage(props: { searchParams: Promise<{ message: string }> }) {
  const searchParams = await props.searchParams
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-zinc-900 p-8 shadow-xl border border-zinc-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-zinc-400">Sign in to your account or create a new one</p>
        </div>

        <form className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-lg border-0 bg-zinc-800 py-2.5 px-3 text-white ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-lg border-0 bg-zinc-800 py-2.5 px-3 text-white ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {searchParams?.message && (
            <div className="rounded-md bg-red-900/50 p-4 border border-red-500/50">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">{searchParams.message}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              formAction={login}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all shadow-sm"
            >
              Sign in
            </button>
            <button
              formAction={signup}
              className="group relative flex w-full justify-center rounded-lg bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 border border-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 transition-all shadow-sm"
            >
              Create an account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
