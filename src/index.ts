import express from 'express'
import dotenv from 'dotenv'
import { ExpressAuth } from '@auth/express'
import Keycloak from '@auth/express/providers/keycloak'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3100

// Validate required environment variables
const requiredEnvVars = ['AUTH_SECRET', 'AUTH_KEYCLOAK_ID', 'AUTH_KEYCLOAK_SECRET', 'AUTH_KEYCLOAK_ISSUER']
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '))
  console.error('Please check your .env file and ensure all required variables are set.')
  process.exit(1)
}

// Add middleware for parsing JSON
app.use(express.json())

// Serve static files from public directory
app.use(express.static('public'))

const authHandler = ExpressAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
      authorization: {
        params: {
          //   scope: 'openid email profile',
          //   redirect_uri: REDIRECT_URI,
          //   state: process.env.AUTH_SECRET,
        },
      },
      profile(profile: any) {
        return { ...profile, extra: 'EXTRA' }
      },
      client: {
        authorization_signed_response_alg: 'ES256',
        id_token_signed_response_alg: 'ES256',
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }: any) {
      if (account?.access_token && account?.expires_at) {
        const { access_token, expires_at, refresh_token } = account
        return {
          ...token,
          access_token,
          expires_at,
          refresh_token,
          profile: user,
        }
      } else if (token?.expires_at && Date.now() < (token.expires_at as number) * 1000) {
        return token
      } else {
        if (!token?.refresh_token) {
          console.error('Refresh token is missing')
          return { ...token, error: 'RefreshTokenError' }
        }

        try {
          const response = await fetch(`${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: process.env.AUTH_KEYCLOAK_ID!,
              client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
              refresh_token: token.refresh_token as string,
            }),
          })

          const tokensOrError = await response.json()

          if (!response.ok) {
            console.error('Token refresh failed:', tokensOrError)
            throw tokensOrError
          }

          const newTokens = tokensOrError as {
            access_token: string
            expires_in: number
            refresh_token?: string
          }

          return {
            ...token,
            access_token: newTokens.access_token,
            expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
            refresh_token: newTokens.refresh_token ?? token.refresh_token,
          }
        } catch (error) {
          console.error('Error refreshing token:', error)
          return { ...token, error: 'RefreshTokenError' }
        }
      }
    },
    async session({ session, token }: any) {
      if (token?.error) {
        console.error('Session contains token error:', token.error)
        // Optionally, you might want to clear the session or redirect to login
      }

      session.accessToken = token?.access_token
      session.idToken = token?.profile
      session.refreshToken = token?.refresh_token
      session.expiresAt = token?.expires_at
      return session
    },
  },
})

app.use('/auth/*', authHandler)

// Serve the test HTML page at root
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
  console.log(`🔐 Auth endpoints available at http://localhost:${PORT}/auth/*`)
  console.log('📋 Available endpoints:')
  console.log(`   - GET  /               - API info`)
  console.log(`   - GET  /health         - Health check`)
  console.log(`   - POST /auth/signin    - Sign in`)
  console.log(`   - POST /auth/signout   - Sign out`)
  console.log(`   - GET  /auth/session   - Get session`)
})
