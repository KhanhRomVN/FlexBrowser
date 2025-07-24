import { openDB } from 'idb'

const DB_NAME = 'fluency_db'
const STORE_NAME = 'gemini_settings'
const API_KEYS_ID = 'gemini_api_keys'
const REQUESTS_PER_MINUTE = 60

export type GeminiModel = 'gemini-2.0-flash'
const DEFAULT_MODEL: GeminiModel = 'gemini-2.0-flash'

interface ApiKeyUsage {
  key: string
  gmail: string
  requestCount: number
  lastResetTime: number
}
interface GeminiSettings {
  apiKeys: ApiKeyUsage[]
  currentKeyIndex: number
}

export interface GeminiSettingsExternal {
  apiKey: string
  gmail?: string // Optional for backward compatibility
  model: string
}

// Convert internal settings to external format
const toExternal = (settings: GeminiSettings): GeminiSettingsExternal => {
  const currentKey = settings.apiKeys[settings.currentKeyIndex]
  return {
    apiKey: currentKey.key,
    gmail: currentKey.gmail,
    model: DEFAULT_MODEL
  }
}

// Convert external settings to internal format
const toInternal = (settings: GeminiSettingsExternal): GeminiSettings => {
  return {
    apiKeys: [
      {
        key: settings.apiKey,
        gmail: settings.gmail || '',
        requestCount: 0,
        lastResetTime: Date.now()
      }
    ],
    currentKeyIndex: 0
  }
}

// In-memory cache for faster access
let currentSettings: GeminiSettings | null = null
let resetTimeout: NodeJS.Timeout | null = null

const resetApiUsage = () => {
  if (currentSettings) {
    currentSettings.apiKeys = currentSettings.apiKeys.map((key) => ({
      ...key,
      requestCount: 0,
      lastResetTime: Date.now()
    }))
    saveSettings(currentSettings)
  }
}
const scheduleReset = () => {
  if (resetTimeout) {
    clearTimeout(resetTimeout)
  }
  resetTimeout = setTimeout(resetApiUsage, 60000) // Reset after 1 minute
}

const getNextAvailableKey = (settings: GeminiSettings): string | null => {
  const now = Date.now()
  for (let i = 0; i < settings.apiKeys.length; i++) {
    const keyIndex = (settings.currentKeyIndex + i) % settings.apiKeys.length
    const keyUsage = settings.apiKeys[keyIndex]
    // Reset if a minute has passed
    if (now - keyUsage.lastResetTime >= 60000) {
      keyUsage.requestCount = 0
      keyUsage.lastResetTime = now
    }
    if (keyUsage.requestCount < REQUESTS_PER_MINUTE) {
      settings.currentKeyIndex = keyIndex
      return keyUsage.key
    }
  }
  return null
}

const saveSettings = async (settings: GeminiSettings) => {
  const db = await dbPromise
  await db.put(STORE_NAME, settings, API_KEYS_ID)
  currentSettings = settings
}

const migrateFromLegacy = async () => {
  const db = await dbPromise
  const legacyKey = await db.get(STORE_NAME, 'gemini_api_key')
  if (legacyKey) {
    const settings: GeminiSettings = {
      apiKeys: [
        {
          key: legacyKey,
          gmail: '', // Add empty gmail for legacy keys
          requestCount: 0,
          lastResetTime: Date.now()
        }
      ],
      currentKeyIndex: 0
    }
    await saveSettings(settings)
    await db.delete(STORE_NAME, 'gemini_api_key')
    return settings
  }
  return null
}

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME)
    }
  }
})

export const GeminiService = {
  async getSettings(): Promise<GeminiSettingsExternal | null> {
    try {
      const db = await dbPromise
      let settings = (await db.get(STORE_NAME, API_KEYS_ID)) as GeminiSettings | null
      if (!settings) {
        settings = await migrateFromLegacy()
      }
      return settings ? toExternal(settings) : null
    } catch (error) {
      console.error('[GeminiService] Error getting settings:', error)
      return null
    }
  },
  async setSettings(externalSettings: GeminiSettingsExternal): Promise<void> {
    try {
      const settings = toInternal(externalSettings)
      await saveSettings(settings)
    } catch (error) {
      console.error('[GeminiService] Error saving settings:', error)
    }
  },
  async addApiKey(apiKey: string, gmail: string = ''): Promise<void> {
    try {
      const db = await dbPromise
      let settings = (await db.get(STORE_NAME, API_KEYS_ID)) as GeminiSettings | null
      if (!settings) {
        settings = {
          apiKeys: [],
          currentKeyIndex: 0
        }
      }
      settings.apiKeys.push({
        key: apiKey,
        gmail,
        requestCount: 0,
        lastResetTime: Date.now()
      })
      await saveSettings(settings)
    } catch (error) {
      console.error('[GeminiService] Error adding API key:', error)
    }
  },
  async removeApiKey(apiKey: string): Promise<void> {
    try {
      const db = await dbPromise
      let settings = (await db.get(STORE_NAME, API_KEYS_ID)) as GeminiSettings | null
      if (settings) {
        settings.apiKeys = settings.apiKeys.filter((k) => k.key !== apiKey)
        settings.currentKeyIndex = 0
        await saveSettings(settings)
      }
    } catch (error) {
      console.error('[GeminiService] Error removing API key:', error)
    }
  },
  async testConnection(): Promise<boolean> {
    try {
      const settings = await this.getSettings()
      if (!settings) return false
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: 'Test connection' }]
              }
            ]
          })
        }
      )
      if (!response.ok) {
        const error = await response.json()
        console.error('[GeminiService] API error:', error)
        throw new Error(error.error?.message || `API request failed with status ${response.status}`)
      }
      const data = await response.json()
      return data && !data.error
    } catch (error) {
      console.error('[GeminiService] Test connection failed:', error)
      return false
    }
  },
  async getNextApiKey(): Promise<string | null> {
    try {
      const db = await dbPromise
      let settings = (await db.get(STORE_NAME, API_KEYS_ID)) as GeminiSettings | null
      if (!settings || settings.apiKeys.length === 0) {
        return null
      }
      const key = getNextAvailableKey(settings)
      if (key) {
        await saveSettings(settings)
        scheduleReset()
      }
      return key
    } catch (error) {
      console.error('[GeminiService] Error getting next API key:', error)
      return null
    }
  }
}
