import React, { useState, useEffect, useRef } from 'react'
import { X, Settings, History as HistoryIcon, Plus, User, Code as CodeIcon } from 'lucide-react'
import { Button } from '../../../../../components/ui/button'
import { Input } from '../../../../../components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '../../../../../components/ui/select'
import useAccountStore, {
  AI_MODELS,
  detectAIModel,
  Tab,
  Account
} from '../../../../../store/useAccountStore'

interface CodeProps {
  onClose?: () => void
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  model: string
  timestamp: string
}

const Code: React.FC<CodeProps> = ({ onClose }) => {
  // Zustand store hooks
  const accounts = useAccountStore((s) => s.accounts)
  const activeAccountId = useAccountStore((s) => s.activeAccountId)
  const setActiveAccount = useAccountStore((s) => s.setActiveAccount)
  const setActiveTab = useAccountStore((s) => s.setActiveTab)
  const updateTab = useAccountStore((s) => s.updateTab)

  // Local UI state
  const [model, setModel] = useState<string>('gpt-4')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [availableTabs, setAvailableTabs] = useState<Tab[]>([])
  const [availableChatGPTTabs, setAvailableChatGPTTabs] = useState<Tab[]>([])
  const [selectedChatGPTTabId, setSelectedChatGPTTabId] = useState<string>('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [debugMode, setDebugMode] = useState<boolean>(false)

  // Derive current account and tab
  const currentAccount: Account | undefined = accounts.find((a) => a.id === selectedAccountId)
  const selectedTabId = currentAccount?.activeTabId || ''
  const currentTab: Tab | undefined = availableTabs.find((t) => t.id === selectedTabId)
  const messages: Message[] = currentTab?.messages || []
  const draft: string = currentTab?.draft || ''

  // Auto-select active account on mount
  useEffect(() => {
    if (activeAccountId) {
      setSelectedAccountId(activeAccountId)
    }
  }, [activeAccountId])

  // Sync tabs list and activeTabId local when account changes
  useEffect(() => {
    if (!selectedAccountId) {
      setAvailableTabs([])
      return
    }
    const acct = accounts.find((a) => a.id === selectedAccountId)
    if (acct) {
      setAvailableTabs(acct.tabs)
      // ensure model list and draft persist
      setAvailableModels(
        acct.tabs.map((t) => t.aiModel || detectAIModel(t.url)).filter((m): m is string => !!m)
      )
      if (!acct.tabs.some((t) => t.aiModel === model)) {
        setModel(acct.tabs[0]?.aiModel || 'gpt')
      }
    }
  }, [selectedAccountId, accounts, model])

  // Sync ChatGPT-specific tabs
  useEffect(() => {
    const chatTabs = availableTabs.filter((tab) => {
      const urlStr = tab.url.toLowerCase()
      return urlStr.includes('chatgpt.com') || urlStr.includes('chat.openai.com')
    })
    setAvailableChatGPTTabs(chatTabs)
    if (!selectedChatGPTTabId && chatTabs.length > 0) {
      setSelectedChatGPTTabId(chatTabs[0].id)
    }
  }, [availableTabs])

  // Scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Utility to persist tab draft
  const onDraftChange = (value: string) => {
    if (!currentAccount || !selectedTabId) return
    updateTab(currentAccount.id, selectedTabId, { draft: value })
  }

  // Send handler
  const handleSend = async () => {
    if (!draft.trim() || isLoading) return
    setError('')
    setIsLoading(true)

    if (!currentAccount?.isSignedIn) {
      setError('Please select a signed-in account to use this feature')
      setIsLoading(false)
      return
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: draft.trim(),
      model,
      timestamp: new Date().toISOString()
    }
    // append user message and clear draft
    updateTab(currentAccount.id, selectedTabId, {
      messages: [...messages, userMsg],
      draft: ''
    })

    try {
      // sync session if needed
      if (currentAccount.idToken) {
        await window.api.session.syncGoogle(currentAccount.idToken)
        await new Promise((r) => setTimeout(r, 500))
      }

      // handle ChatGPT model
      if (model === 'chatgpt') {
        const targetTabId = availableChatGPTTabs[0]?.id || currentAccount.activeTabId!
        setActiveTab(currentAccount.id, targetTabId)
        await new Promise((r) => setTimeout(r, 500))
        const chatResult = await window.api.chatgpt.askViaTab(
          targetTabId,
          draft.trim(),
          currentAccount.id
        )
        if (!chatResult.success) {
          throw new Error(chatResult.error || 'ChatGPT ask failed')
        }
        const assistantMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: chatResult.response,
          model,
          timestamp: new Date().toISOString()
        }
        updateTab(currentAccount.id, selectedTabId, {
          messages: [...messages, userMsg, assistantMsg]
        })
      } else {
        // fallback for other models
        const tabId = currentAccount.activeTabId
        setActiveTab(currentAccount.id, tabId!)
        await new Promise((r) => setTimeout(r, 200))
        const chatResult = await window.api.chatgpt.askViaTab(
          tabId!,
          draft.trim(),
          currentAccount.id
        )
        if (!chatResult.success) {
          throw new Error(chatResult.error || 'Ask failed')
        }
        const assistantMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: chatResult.response,
          model,
          timestamp: new Date().toISOString()
        }
        updateTab(currentAccount.id, selectedTabId, {
          messages: [...messages, userMsg, assistantMsg]
        })
      }
    } catch (err: any) {
      console.error('[Code] handleSend error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground pb-16">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => setDebugMode(!debugMode)}>
            <CodeIcon className="w-5 h-5" />
          </Button>
          <Plus className="w-5 h-5 cursor-pointer hover:text-primary" />
          <Settings className="w-5 h-5 cursor-pointer hover:text-primary" />
          <HistoryIcon className="w-5 h-5 cursor-pointer hover:text-primary" />
        </div>
        <X className="w-5 h-5 cursor-pointer hover:text-destructive" onClick={onClose} />
      </div>

      {debugMode && (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 text-xs">
          <div>Account: {selectedAccountId}</div>
          <div>Tab: {selectedTabId}</div>
          <div>Draft: {draft}</div>
          <div>Messages: {messages.length}</div>
          <div>Error: {error}</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <div className="mb-4 bg-gray-200 dark:bg-gray-700 rounded-full p-4">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold">No conversation history</h3>
            <p className="mt-2">Select an account and start chatting</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {message.role === 'assistant' && ` · ${message.model}`}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full delay-75 animate-pulse" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full delay-150 animate-pulse" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        {error && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={model} onValueChange={setModel} disabled={!availableModels.length}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => {
                const info = AI_MODELS.find((x) => x.id === m)
                return (
                  <SelectItem key={m} value={m}>
                    {info?.name || m}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select
            value={selectedAccountId}
            onValueChange={(id) => {
              setSelectedAccountId(id)
              setActiveAccount(id)
            }}
          >
            <SelectTrigger className="min-w-32">
              <SelectValue placeholder="Select account">
                {selectedAccountId ? (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {currentAccount?.name}
                  </div>
                ) : (
                  'Select account'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.length === 0 ? (
                <div className="py-2 px-3 text-sm text-gray-500">No accounts</div>
              ) : (
                accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center">
                      {acc.picture ? (
                        <img
                          src={acc.picture}
                          alt={acc.name}
                          className="w-5 h-5 rounded-full mr-2"
                        />
                      ) : (
                        <User className="w-4 h-4 mr-2" />
                      )}
                      {acc.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {model === 'chatgpt' && availableChatGPTTabs.length > 1 && (
            <Select value={selectedChatGPTTabId} onValueChange={setSelectedChatGPTTabId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="ChatGPT tab" />
              </SelectTrigger>
              <SelectContent className="w-48">
                {availableChatGPTTabs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-w-[150px]"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading || !currentAccount?.isSignedIn}
          />

          <Button
            onClick={handleSend}
            disabled={isLoading || !draft.trim() || !currentAccount?.isSignedIn}
          >
            Send
          </Button>
        </div>

        {!accounts.some((a) => a.isSignedIn) && (
          <div className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
            You need to sign in to an account to use ChatGPT. Close this panel and sign in first.
          </div>
        )}
      </div>
    </div>
  )
}

export default Code
