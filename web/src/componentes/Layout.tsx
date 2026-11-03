import { Outlet } from 'react-router'

export function Layout() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Outlet />
    </main>
  )
}
