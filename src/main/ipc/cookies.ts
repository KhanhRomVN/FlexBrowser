import { session } from 'electron'

// Utility to fetch cookies from the default session for a given domain
export async function getCookiesForDomain(domain: string) {
    return session.defaultSession.cookies.get({ domain })
}

// Sync Google session token as a cookie across ChatGPT domains
export async function syncGoogleSession(idToken: string): Promise<void> {
    const domains = ['chat.openai.com', 'openai.com', 'chatgpt.com', 'auth.openai.com']
    for (const domain of domains) {
        try {
            await session.defaultSession.cookies.set({
                url: `https://${domain}`,
                name: '__Secure-next-auth.session-token',
                value: idToken,
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 1 week
            })
            console.log(`[ipc-cookies] Cookie set successfully for ${domain}`)
        } catch (error: any) {
            console.error(`[ipc-cookies] Failed to set cookie for ${domain}:`, error)
        }
    }
}

// Sync ChatGPT session token across the hidden background window's partition
export async function syncChatGPTSession(): Promise<void> {
    try {
        const domains = ['chat.openai.com', 'auth.openai.com']
        const chatSession = session.fromPartition('persist:chatgpt-session')
        for (const domain of domains) {
            const tokens = await session.defaultSession.cookies.get({
                domain,
                name: '__Secure-next-auth.session-token'
            })
            if (tokens.length === 0) {
                console.log(`[ipc-cookies] No token found for ${domain}`)
                continue
            }
            for (const cookie of tokens) {
                await chatSession.cookies.set({
                    url: `https://${domain}`,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite,
                    expirationDate: cookie.expirationDate!
                })
                console.log(`[ipc-cookies] ChatGPT session token synced for ${domain}`)
            }
        }
        console.log('[ipc-cookies] ChatGPT session synced successfully')
    } catch (error: any) {
        console.error('[ipc-cookies] Failed to sync ChatGPT session:', error)
    }
}