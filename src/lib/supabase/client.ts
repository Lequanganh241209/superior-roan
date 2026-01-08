import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const valid = Boolean(supabaseUrl) && Boolean(supabaseAnonKey) && !supabaseUrl.includes('example') && !supabaseAnonKey.includes('example')

function createLocalClient() {
  let session: any = null
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('dev_session') || 'null'
      session = JSON.parse(raw)
    } catch {}
  }
  const listeners = new Set<(event: string, session: any) => void>()
  const notify = (event: string) => {
    listeners.forEach((cb) => {
      try { cb(event, session) } catch {}
    })
  }
  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        session = { user: { id: 'dev-user', email } }
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('dev_session', JSON.stringify(session)) } catch {}
        }
        notify('SIGNED_IN')
        return { data: { user: session.user }, error: null }
      },
      async signUp({ email, password }: { email: string; password: string }) {
        return { data: { user: { id: 'dev-user', email } }, error: null }
      },
      async signOut() {
        session = null
        if (typeof window !== 'undefined') {
          try { window.localStorage.removeItem('dev_session') } catch {}
        }
        notify('SIGNED_OUT')
        return { error: null }
      },
      async getSession() {
        return { data: { session }, error: null }
      },
      onAuthStateChange(cb: (event: string, session: any) => void) {
        listeners.add(cb)
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
      }
    },
    from() {
      return {
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        eq() { return this },
        order() { return this },
        single: async () => ({ data: null, error: null })
      }
    }
  } as any
}

export const supabase = valid ? createBrowserClient(supabaseUrl, supabaseAnonKey) : createLocalClient()
