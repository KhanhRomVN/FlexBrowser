import React, { useState, useEffect, useRef } from 'react'
import { X, Settings, History as HistoryIcon, Plus, User } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '../../../../components/ui/select'
import useAccountStore from '../../../../store/useAccountStore'

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

  const accounts = useAccountStore((state) => state.accounts)
  const signedInAccounts = accounts.filter((acc) => acc.isSignedIn)
  const { addTab, setActiveTab, updateTab } = useAccountStore()

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

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

      // Tìm tab ChatGPT hoặc tạo mới
      let aiTab = account.tabs.find((tab) => tab.url.includes('chat.openai.com'))
      let tabId = aiTab?.id || ''

      if (!aiTab) {
        tabId = `${account.id}-ai-${Date.now()}`
        const newTab = {
          id: tabId,
          title: 'ChatGPT',
          url: 'https://chat.openai.com',
          icon: 'https://chat.openai.com/favicon.ico'
        }
        addTab(account.id, newTab)
        setActiveTab(account.id, tabId)
        aiTab = newTab

        // Chờ tab tải xong
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } else {
        setActiveTab(account.id, tabId)
      }

      const webview = document.getElementById(`webview-${tabId}`) as any
      if (!webview) throw new Error('Webview not found')

      // Nhập câu hỏi vào ChatGPT
      const inputResult = await webview.executeJavaScript(`
        (function() {
          const input = document.querySelector('textarea');
          if (!input) return 'INPUT_NOT_FOUND';
          input.value = ${JSON.stringify(input.trim())};
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return 'SUCCESS';
        })();
      `)

      if (inputResult === 'INPUT_NOT_FOUND') {
        throw new Error('Could not find ChatGPT input field')
      }

      // Gửi câu hỏi
      await webview.executeJavaScript(`
        (function() {
          const button = document.querySelector('textarea ~ button');
          if (button) button.click();
        })();
      `)

      // Theo dõi câu trả lời
      const response = await new Promise<string>((resolve, reject) => {
        let attempts = 0
        const maxAttempts = 60 // 60 giây timeout
        const interval = setInterval(async () => {
          attempts++
          const result = await webview.executeJavaScript(`
            (function() {
              const messages = document.querySelectorAll('[data-testid^="conversation-turn-"]');
              if (!messages.length) return null;
              
              const lastMessage = messages[messages.length - 1];
              const isGenerating = lastMessage.querySelector('.result-streaming');
              if (isGenerating) return null;
              
              const content = lastMessage.querySelector('.markdown');
              return content ? content.innerText : null;
            })();
          `)

          if (result) {
            clearInterval(interval)
            resolve(result)
          } else if (attempts >= maxAttempts) {
            clearInterval(interval)
            reject(new Error('Timeout waiting for response'))
          }
        }, 1000)
      })

      // Cập nhật tin nhắn mới
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

      // Cập nhật tiêu đề tab với nội dung tóm tắt
      if (aiTab) {
        const summary = input.substring(0, 30) + (input.length > 30 ? '...' : '')
        updateTab(account.id, aiTab.id, {
          title: `Chat: ${summary}`
        })
      }
    } catch (err: any) {
      setError(`Error: ${err.message || 'Something went wrong'}`)
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
    <div className="flex flex-col h-full w-full bg-background text-foreground">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center space-x-3">
          <Plus className="w-5 h-5 cursor-pointer hover:text-primary" />
          <Settings className="w-5 h-5 cursor-pointer hover:text-primary" />
          <HistoryIcon className="w-5 h-5 cursor-pointer hover:text-primary" />
        </div>
        <X className="w-5 h-5 cursor-pointer hover:text-destructive" onClick={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
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
                <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
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
