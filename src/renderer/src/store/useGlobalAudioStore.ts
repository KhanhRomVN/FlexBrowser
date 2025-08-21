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
    set((prev) => {
      const newStates = {
        ...prev.audioStates,
        [tabId]: state
      }

      return { audioStates: newStates }
    })
  },

  clearAudioState: (tabId: string) => {
    set((prev) => {
      const newStates = { ...prev.audioStates }
      delete newStates[tabId]

      return { audioStates: newStates }
    })
  },

  clearAllAudioStates: () => {
    set({ audioStates: {} })
  },

  getPlayingTabs: () => {
    const states = get().audioStates
    const playing = Object.entries(states).filter(([_, state]) => state.isPlaying)
    return playing
  }
}))
