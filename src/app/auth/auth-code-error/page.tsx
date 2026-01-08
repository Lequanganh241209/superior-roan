import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="mb-4">There was an error signing in with the provider.</p>
      <Link href="/login" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Return to Login
      </Link>
    </div>
  )
}
