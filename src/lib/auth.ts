import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const COOKIE_NAME = 'auth_token'

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!)
}

export interface TeacherSession {
  teacherCode: string
  role: string
  grade: number | null
  classNumber: number | null
}

export async function createToken(session: TeacherSession): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<TeacherSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as TeacherSession
  } catch {
    return null
  }
}

export async function getSession(): Promise<TeacherSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}
