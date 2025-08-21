import { create } from 'zustand'

type AudioState = {
  isPlaying: boolean
  url: string
  title: string
}

type AudioStore = {
  audioStates: Record<string, AudioState>
  setAudioState: (tabId: string, state: AudioState) => void
  clearAudioState: (tabId: string) => void
  clearAllAudioStates: () => void
  getPlayingTabs: () => [string, AudioState][]
}

export const useGlobalAudioStore = create<AudioStore>((set, get) => ({
  audioStates: {},

  setAudioState: (tabId: string, state: AudioState) => {
    console.log(`[AudioStore][SET] Tab ${tabId}:`, state)

    set((prev) => {
      const newStates = {
        ...prev.audioStates,
        [tabId]: state
      }

      console.log(`[AudioStore][SET] Updated states:`, newStates)
      console.log(
        `[AudioStore][SET] Playing count:`,
        Object.values(newStates).filter((s) => s.isPlaying).length
      )

      return { audioStates: newStates }
    })
  },

  clearAudioState: (tabId: string) => {
    console.log(`[AudioStore][CLEAR] Tab ${tabId}`)

    set((prev) => {
      const newStates = { ...prev.audioStates }
      delete newStates[tabId]

      console.log(`[AudioStore][CLEAR] Remaining states:`, newStates)

      return { audioStates: newStates }
    })
  },

  clearAllAudioStates: () => {
    console.log(`[AudioStore][CLEAR_ALL] Clearing all audio states`)
    set({ audioStates: {} })
  },

  getPlayingTabs: () => {
    const states = get().audioStates
    const playing = Object.entries(states).filter(([_, state]) => state.isPlaying)
    console.log(`[AudioStore][GET_PLAYING] Found ${playing.length} playing tabs:`, playing)
    return playing
  }
}))

// Debug helper - log store state every few seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useGlobalAudioStore.getState()
    const playingCount = Object.values(state.audioStates).filter((s) => s.isPlaying).length
    const totalCount = Object.keys(state.audioStates).length

    if (totalCount > 0) {
      console.log(
        `[AudioStore][DEBUG] Total: ${totalCount}, Playing: ${playingCount}`,
        state.audioStates
      )
    }
  }, 5000)
}
