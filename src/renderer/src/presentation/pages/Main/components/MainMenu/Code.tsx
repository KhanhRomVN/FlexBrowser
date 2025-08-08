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
  Account
} from '../../../../../store/useAccountStore'

interface CodeProps {
  onClose?: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model: string
  timestamp: Date
}

const Code: React.FC<CodeProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('gpt-4')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [debugMode, setDebugMode] = useState(false)

  // Tabs for ChatGPT integration
  interface Tab {
    id: string
    url: string
    title: string
    icon?: string
    aiModel?: string
  }
  const [availableTabs, setAvailableTabs] = useState<Tab[]>([])

  // ChatGPT specific tabs
  const [availableChatGPTTabs, setAvailableChatGPTTabs] = useState<Tab[]>([])
  const [selectedChatGPTTabId, setSelectedChatGPTTabId] = useState<string>('')
  const [selectedTabId, setSelectedTabId] = useState<string>('')
  const accounts: Account[] = useAccountStore((state) => state.accounts)

  // Populate available tabs and default selectedTabId when account changes
  useEffect(() => {
    if (!selectedAccountId) {
      setAvailableTabs([])
      setSelectedTabId('')
      return
    }
    const acct = accounts.find((acc) => acc.id === selectedAccountId)
    if (acct) {
      setAvailableTabs(acct.tabs)
      setSelectedTabId(acct.activeTabId || '')
    }
  }, [selectedAccountId, accounts])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  // Auto-select the current active account when opening Code panel
  const activeAccountIdFromStore = useAccountStore((state) => state.activeAccountId)

  useEffect(() => {
    if (activeAccountIdFromStore) {
      setSelectedAccountId(activeAccountIdFromStore)
    }
  }, [activeAccountIdFromStore])

  const getAvailableModels = (accountId: string): string[] => {
    const account = signedInAccounts.find((acc) => acc.id === accountId)
    if (!account) return []
    const models = account.tabs
      .map((t) => t.aiModel || detectAIModel(t.url))
      .filter((m): m is string => Boolean(m))
    return Array.from(new Set(models))
  }
  const signedInAccounts = accounts.filter((acc) => acc.isSignedIn)
  // Sync ChatGPT session when Code panel mounts for signed-in account
  useEffect(() => {
    if (!selectedAccountId) return
    const acct = signedInAccounts.find((acc) => acc.id === selectedAccountId)
    if (acct?.idToken) {
      window.api.session.syncGoogle(acct.idToken)
    }
  }, [selectedAccountId, signedInAccounts])
  useEffect(() => {
    if (selectedAccountId) {
      let models = getAvailableModels(selectedAccountId)
      // Ensure default model when none are available
      if (models.length === 0) {
        models = ['gpt']
      }
      setAvailableModels(models)
      if (!models.includes(model)) {
        setModel(models[0])
      }
    } else {
      // No account selected: fallback to default model
      setAvailableModels(['gpt'])
      setModel('gpt')
    }
  }, [selectedAccountId, accounts])
  // Update ChatGPT-specific tabs when availableTabs change
  useEffect(() => {
    const chatTabs = getValidChatGPTTabs(availableTabs)
    setAvailableChatGPTTabs(chatTabs)
    if (!selectedChatGPTTabId && chatTabs.length > 0) {
      setSelectedChatGPTTabId(chatTabs[0].id)
    }
  }, [availableTabs])

  // Hàm lọc tab ChatGPT hợp lệ
  const getValidChatGPTTabs = (tabs: Tab[]): Tab[] => {
    return tabs.filter((tab) => {
      // Accept any ChatGPT or chat.openai.com tab, regardless of query params
      const urlStr = tab.url.toLowerCase()
      return urlStr.includes('chatgpt.com') || urlStr.includes('chat.openai.com')
    })
  }

  const { setActiveTab, updateTab } = useAccountStore()

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    console.log('[Code] Sending message:', {
      input,
      model,
      selectedAccountId,
      signedIn: !!signedInAccounts.find((a) => a.id === selectedAccountId)
    })

    if (!selectedAccountId || !signedInAccounts.some((acc) => acc.id === selectedAccountId)) {
      setError('Please select a signed-in account to use this feature')
      return
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      model,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, newMessage])
    setInput('')
    setIsLoading(true)
    setError('')

    try {
      const account = signedInAccounts.find((acc) => acc.id === selectedAccountId)
      if (!account) throw new Error('Account not found')
      // Sync hidden ChatGPT window session before asking
      if (account.idToken) {
        console.log('[Code] Syncing session with idToken:', account.idToken)
        await window.api.session.syncGoogle(account.idToken)
        // ensure sync completes
        await new Promise((r) => setTimeout(r, 1000))
      }

      // Handle ChatGPT via browser tab
      if (model === 'chatgpt') {
        const chatTabs = availableChatGPTTabs
        // pick first ChatGPT tab if exists, otherwise fallback to active tab
        const targetTabId = chatTabs[0]?.id || account.activeTabId!
        setActiveTab(account.id, targetTabId)
        // slight delay for webview readiness
        await new Promise((resolve) => setTimeout(resolve, 500))
        const chatResult = await window.api.chatgpt.askViaTab(
          targetTabId,
          input.trim(),
          selectedAccountId
        )
        if (!chatResult.success) {
          throw new Error(chatResult.error || 'ChatGPT ask failed')
        }
        const response = chatResult.response
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: response,
            model,
            timestamp: new Date()
          }
        ])
        const summary = input.substring(0, 30) + (input.length > 30 ? '...' : '')
        updateTab(account.id, targetTabId, { title: `Chat: ${summary}` })
      } else {
        // Fallback for other models
        const tabId = account.activeTabId
        if (!tabId) {
          throw new Error('Active tab not found')
        }
        setActiveTab(account.id, tabId)
        await new Promise((resolve) => setTimeout(resolve, 200))
        const chatResult = await window.api.chatgpt.askViaTab(
          tabId,
          input.trim(),
          selectedAccountId
        )
        if (!chatResult.success) {
          throw new Error(chatResult.error || 'Ask failed')
        }
        const response = chatResult.response
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: chatResult.response,
            model,
            timestamp: new Date()
          }
        ])
      }
    } catch (err: any) {
      console.error('[renderer] ChatGPT handleSend error:', err)
      let errorMessage = err.message || 'Something went wrong'

      if (errorMessage.includes('ELEMENT_TIMEOUT')) {
        errorMessage = 'ChatGPT is taking too long to respond. Please check your connection.'
      } else if (errorMessage.includes('USER_NOT_LOGGED_IN')) {
        errorMessage = 'Please login to ChatGPT in your browser first'
      } else if (errorMessage.includes('NEW_CHAT_LINK_NOT_FOUND')) {
        errorMessage = 'ChatGPT UI has changed - please update the app'
      }

      setError(`Error: ${errorMessage}`)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Failed to get response from ChatGPT',
          model,
          timestamp: new Date()
        }
      ])
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
          <div>Active Account: {selectedAccountId}</div>
          <div>Models: {availableModels.join(', ')}</div>
          <div>Last Error: {error}</div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        {availableChatGPTTabs.length > 1 && (
          <div className="mb-4">
            <Select value={selectedChatGPTTabId} onValueChange={setSelectedChatGPTTabId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select ChatGPT tab" />
              </SelectTrigger>
              <SelectContent className="w-48">
                {availableChatGPTTabs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {availableChatGPTTabs.length === 0 && (
          <div className="mb-4 text-red-500">
            No ChatGPT tabs found. Open one at chatgpt.com or chat.openai.com
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <div className="mb-4 bg-gray-200 dark:bg-gray-700 rounded-full p-4">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold">No conversation history</h3>
            <p className="mt-2">Select an account and start chatting with ChatGPT</p>
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
                    {message.timestamp.toLocaleTimeString([], {
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
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
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
          <div className="flex flex-1 gap-3">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-gray-500">No AI models available</div>
                ) : (
                  availableModels.map((modelId) => {
                    const info = AI_MODELS.find((m) => m.id === modelId)
                    return (
                      <SelectItem key={modelId} value={modelId}>
                        {info?.name || modelId}
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>

            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="min-w-32">
                <SelectValue placeholder="Select account">
                  {selectedAccountId ? (
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {signedInAccounts.find((a) => a.id === selectedAccountId)?.name}
                    </div>
                  ) : (
                    'Select account'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {signedInAccounts.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-gray-500">No signed-in accounts</div>
                ) : (
                  signedInAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center">
                        {account.picture ? (
                          <img
                            src={account.picture}
                            alt={account.name}
                            className="w-5 h-5 rounded-full mr-2"
                          />
                        ) : (
                          <User className="w-4 h-4 mr-2" />
                        )}
                        {account.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {model === 'chatgpt' && availableChatGPTTabs.length > 1 && (
              <Select value={selectedChatGPTTabId} onValueChange={setSelectedChatGPTTabId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select ChatGPT tab" />
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
            {availableChatGPTTabs.length === 0 && (
              <div className="text-red-500">
                No ChatGPT tabs found. Open one at chatgpt.com or chat.openai.com
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-w-[150px]"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading || signedInAccounts.length === 0}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || signedInAccounts.length === 0}
            >
              Send
            </Button>
          </div>
        </div>

        {signedInAccounts.length === 0 && (
          <div className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
            You need to sign in to an account to use ChatGPT. Close this panel and sign in first.
          </div>
        )}
      </div>
    </div>
  )
}

export default Code
