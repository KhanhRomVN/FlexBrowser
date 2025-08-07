import { session } from 'electron'

// Utility to fetch cookies from the default session for a given domain
export async function getCookiesForDomain(domain: string) {
    return session.defaultSession.cookies.get({ domain })
}

// Sync Google session token as a cookie across ChatGPT domains
export async function syncGoogleSession(idToken: string): Promise<void> {
    const domains = ['chat.openai.com', 'openai.com', 'chatgpt.com', 'auth.openai.com', 'accounts.google.com']
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

        // Sync Google session token into ChatGPT partition as well
        const googleTokens = await session.defaultSession.cookies.get({
            name: '__Secure-next-auth.session-token',
            domain: '.google.com'
        })
        if (googleTokens.length > 0) {
            const googleToken = googleTokens[0].value
            for (const domain of domains) {
                try {
                    await chatSession.cookies.set({
                        url: `https://${domain}`,
                        name: '__Secure-next-auth.session-token',
                        value: googleToken,
                        httpOnly: true,
                        secure: true,
                        sameSite: 'lax',
                        expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
                    })
                    console.log(`[ipc-cookies] Synced Google token for ${domain} in chat partition`)
                } catch (error: any) {
                    console.error(`[ipc-cookies] Failed to sync Google token for ${domain}:`, error)
                }
            }
        }

        // Fetch token from default session
        const tokens = await session.defaultSession.cookies.get({
            name: '__Secure-next-auth.session-token'
        })
        if (tokens.length === 0) {
            console.log('[ipc-cookies] No session token found in default session')
            return
        }
        const token = tokens[0].value

        for (const domain of domains) {
            await chatSession.cookies.set({
                url: `https://${domain}`,
                name: '__Secure-next-auth.session-token',
                value: token,
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
            })
            console.log(`[ipc-cookies] ChatGPT session token synced for ${domain}`)
        }
    } catch (error: any) {
        console.error('[ipc-cookies] Failed to sync ChatGPT session:', error)
        throw error
    }
}