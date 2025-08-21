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
}

export const useGlobalAudioStore = create<AudioStore>((set) => ({
  audioStates: {},
  setAudioState: (tabId: string, state: AudioState) =>
    set((prev) => ({
      audioStates: {
        ...prev.audioStates,
        [tabId]: state
      }
    })),
  clearAudioState: (tabId: string) =>
    set((prev) => {
      const newStates = { ...prev.audioStates }
      delete newStates[tabId]
      return { audioStates: newStates }
    })
}))
