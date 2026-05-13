import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isProtected = pathname.startsWith('/teacher') || pathname.startsWith('/admin')
  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('auth_token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  try {
    await jwtVerify(token, secret())
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/teacher/:path*', '/admin/:path*'],
}
