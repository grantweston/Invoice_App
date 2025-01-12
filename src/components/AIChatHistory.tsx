import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './AIChatHistory.module.css'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

function AIChatHistory() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    setIsLoading(true)
    console.log('Loading messages from Supabase...')
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Supabase error:', error)
      return
    }
    
    console.log('Messages loaded:', data)
    setMessages(data || [])
    setIsLoading(false)
  }

  const saveMessage = async (message: Omit<Message, 'id' | 'created_at'>) => {
    setIsLoading(true)
    console.log('Saving message to Supabase:', message)
    
    const { error, data } = await supabase
      .from('messages')
      .insert([message])
      .select()
    
    if (error) {
      console.error('Supabase error:', error)
      return
    }
    
    console.log('Message saved:', data)
    await loadMessages()
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    await saveMessage({
      role: 'user',
      content: newMessage
    })
    setNewMessage('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {isLoading && <div>Loading...</div>}
        {messages.map((message) => (
          <div key={message.id} className={`${styles.message} ${styles[message.role]}`}>
            {message.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className={styles.input}
          disabled={isLoading}
        />
        <button type="submit" className={styles.button} disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default AIChatHistory 