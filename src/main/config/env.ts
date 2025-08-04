import * as dotenv from 'dotenv'
dotenv.config()

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
export const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:42813/callback'
export const GOOGLE_AUTH_URL =
  process.env.GOOGLE_AUTH_URL ?? 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL =
  process.env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token'
export const GOOGLE_USERINFO_URL =
  process.env.GOOGLE_USERINFO_URL ?? 'https://www.googleapis.com/oauth2/v2/userinfo'
