export interface ClientConfig {
  apiKey?: string
  clientId?: string
  clientSecret?: string
  baseUrl: string
}

interface TokenCache {
  token: string
  expiresAt: number
}

const TOKEN_LEEWAY_MS = 60_000

export class VengtooClient {
  private config: ClientConfig
  private tokenCache: TokenCache | null = null

  constructor(config: ClientConfig) {
    this.config = config
  }

  private async getToken(): Promise<string | null> {
    if (this.config.apiKey) return this.config.apiKey
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        'Vengtoo credentials not configured. Set VENGTOO_API_KEY, or both VENGTOO_CLIENT_ID and VENGTOO_CLIENT_SECRET in the MCP server env.'
      )
    }

    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - TOKEN_LEEWAY_MS) {
      return this.tokenCache.token
    }

    const res = await fetch(`${this.config.baseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OAuth token exchange failed (${res.status}): ${body}`)
    }

    const data = await res.json() as { access_token: string; expires_in?: number }
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    }
    return this.tokenCache.token
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    // On 401, invalidate token cache and retry once (token may have been revoked)
    if (res.status === 401 && this.tokenCache) {
      this.tokenCache = null
      return this.request<T>(method, path, body)
    }

    const text = await res.text()
    if (!res.ok) throw new Error(`Vengtoo API error (${res.status}): ${text}`)
    if (!text) return undefined as T
    return JSON.parse(text) as T
  }

  get<T>(path: string) { return this.request<T>('GET', path) }
  post<T>(path: string, body: unknown) { return this.request<T>('POST', path, body) }
  put<T>(path: string, body: unknown) { return this.request<T>('PUT', path, body) }
  delete(path: string) { return this.request<void>('DELETE', path) }
}

export function clientFromEnv(): VengtooClient {
  const baseUrl = process.env.VENGTOO_BASE_URL ?? 'https://api.vengtoo.com'
  const apiKey = process.env.VENGTOO_API_KEY
  const clientId = process.env.VENGTOO_CLIENT_ID
  const clientSecret = process.env.VENGTOO_CLIENT_SECRET
  // Credentials are validated on the first API call, not at startup,
  // so the MCP server can register its tools before any call is made.
  return new VengtooClient({ apiKey, clientId, clientSecret, baseUrl })
}
