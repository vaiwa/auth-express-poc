# Auth Express POC with Keycloak

A simple TypeScript Express application demonstrating Keycloak authentication using Auth.js

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:

   ```
   PORT=3100
   NODE_ENV=development

   AUTH_SECRET=your-secret-key
   AUTH_KEYCLOAK_ID=your-keycloak-client-id
   AUTH_KEYCLOAK_SECRET=your-keycloak-client-secret
   AUTH_KEYCLOAK_ISSUER=https://your-keycloak-server/realms/your-realm
   ```

## Running the Application

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Available Endpoints

- `GET /` - API information and available endpoints
- `GET /health` - Health check
- `POST /auth/signin` - Keycloak sign in
- `POST /auth/signout` - Sign out
- `GET /auth/session` - Get current session

## Authentication Flow

1. Navigate to `http://localhost:3100/auth/signin` to initiate Keycloak login
2. You'll be redirected to your Keycloak server for authentication
3. After successful login, you'll be redirected back to your application
4. Use `http://localhost:3100/auth/session` to check your session status

## Architecture

This POC demonstrates:

- Express.js server with TypeScript
- Auth.js integration for authentication
- Keycloak as the identity provider

## Notes

- The Keycloak provider configuration is loaded from environment variables
- Session management is handled by Auth.js
- For production, ensure proper HTTPS configuration and security headers
