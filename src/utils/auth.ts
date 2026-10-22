import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { DEMO_USER } from '@/lib/storage/mockDb'

export { DEMO_USER }

/**
 * Returns the authenticated Supabase user or falls back to a Guest Developer
 * profile when authentication is bypassed or Supabase is offline.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const hasAuthCookie = allCookies.some(
      (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
    )

    // If no Supabase auth token cookie is present, avoid waiting for DNS/network timeouts
    if (!hasAuthCookie) {
      return DEMO_USER
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) return user
  } catch {
    // Supabase unreachable or offline
  }

  return DEMO_USER
}
