'use client'

import { useState, useEffect, useCallback } from 'react'

// TensorFlow.js CDN integration
const loadTensorFlow = () => {
  if (typeof window !== 'undefined' && !(window as unknown as { tf?: unknown }).tf) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs'
    script.async = true
    document.head.appendChild(script)
  }
}

interface FeatureFlags {
  createImage: boolean
  database: boolean
  chat: boolean
  youtube: boolean
  tiktok: boolean
  tetris: boolean
  p2pChat: boolean
  invite: boolean
  donate: boolean
  nexusAvatar: boolean
  backgroundSounds: boolean
  aiOnlineStatus: boolean
  spotify: boolean
  notifications: boolean
  gameCenter: boolean
  memoryVault: boolean
}

const defaultFeatures: FeatureFlags = {
  createImage: true,
  database: true,
  chat: true,
  youtube: true,
  tiktok: true,
  tetris: true,
  p2pChat: true,
  invite: true,
  donate: true,
  nexusAvatar: true,
  backgroundSounds: true,
  aiOnlineStatus: true,
  spotify: true,
  notifications: true,
  gameCenter: true,
  memoryVault: true
}

interface AdminStats {
  totalUsers: number
  totalImages: number
  totalMessages: number
  totalP2PMessages: number
  totalInvites: number
  pendingPasswordResets: number
  activeConnections: number
  serverUptime: string
  memoryUsage: string
  cpuUsage: string
}

interface AdminUser {
  id: string
  email: string
  username: string
  isAdmin: boolean
  isBanned: boolean
  features?: string
  createdAt: string
  _count: { generatedImages: number; sentMessages: number }
}

interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AdminPanel({ 
  features: propFeatures, 
  setFeatures: propSetFeatures 
}: { 
  features: FeatureFlags
  setFeatures: (f: FeatureFlags) => void 
}) {
  // State
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0, totalImages: 0, totalMessages: 0, totalP2PMessages: 0,
    totalInvites: 0, pendingPasswordResets: 0, activeConnections: 0,
    serverUptime: '0s', memoryUsage: '0%', cpuUsage: '0%'
  })
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [musicLinks, setMusicLinks] = useState<{name: string; url: string}[]>([])
  const [newMusicName, setNewMusicName] = useState('')
  const [newMusicUrl, setNewMusicUrl] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [userFeatures, setUserFeatures] = useState<FeatureFlags>({ ...defaultFeatures })
  const [passwordResets, setPasswordResets] = useState<{id: string; email: string; approved: boolean; user: {username: string}; createdAt: string}[]>([])
  const [appUrls, setAppUrls] = useState<string[]>([])
  const [newUrl, setNewUrl] = useState('')
  
  // AI Chat State
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [tfLoaded, setTfLoaded] = useState(false)
  
  // Terminal State
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalLoading, setTerminalLoading] = useState(false)
  
  // Analytics State
  const [analytics, setAnalytics] = useState({
    dailyActiveUsers: [] as number[],
    weeklySignups: [] as number[],
    topFeatures: [] as {name: string; count: number}[],
    errorRate: 0,
    avgResponseTime: 0
  })

  // Load TensorFlow
  useEffect(() => {
    loadTensorFlow()
    setTimeout(() => setTfLoaded(true), 2000)
  }, [])

  // Fetch initial data
  useEffect(() => {
    fetch('/api/admin')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(prev => ({ ...prev, ...data.stats }))
          setUsers(data.users)
        }
      })
      .finally(() => setLoading(false))
    
    const savedLinks = localStorage.getItem('nexus_music_links')
    if (savedLinks) {
      try { setMusicLinks(JSON.parse(savedLinks)) } catch {}
    }
    
    fetch('/api/admin?tab=password-resets')
      .then(res => res.json())
      .then(data => { if (data.success) setPasswordResets(data.resetRequests) })
    
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => { if (data.urls) setAppUrls(data.urls) })
  }, [])

  // AI Chat
  const sendAiMessage = useCallback(async () => {
    if (!aiInput.trim() || aiLoading) return
    
    const userMessage = aiInput
    setAiInput('')
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }])
    setAiLoading(true)
    
    try {
      const res = await fetch('/api/nexus-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'aiThink',
          prompt: `You are NEXUS Admin AI Assistant. Help the admin with: ${userMessage}
          
Context: You have access to admin panel with ${stats.totalUsers} users, ${stats.totalImages} images, ${stats.totalMessages} messages.
Provide helpful, actionable advice for managing NEXUS OS.`,
          context: 'admin assistant'
        })
      })
      const data = await res.json()
      
      if (data.success && data.response) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date() }])
      }
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI. Please try again.', timestamp: new Date() }])
    } finally {
      setAiLoading(false)
    }
  }, [aiInput, aiLoading, stats])

  // Terminal Command
  const executeCommand = useCallback(async () => {
    if (!terminalInput.trim() || terminalLoading) return
    
    const cmd = terminalInput
    setTerminalInput('')
    setTerminalOutput(prev => [...prev, `$ ${cmd}`])
    setTerminalLoading(true)
    
    try {
      const res = await fetch('/api/nexus-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', command: cmd })
      })
      const data = await res.json()
      setTerminalOutput(prev => [...prev, data.output || 'Command executed'])
    } catch (err) {
      setTerminalOutput(prev => [...prev, 'Error executing command'])
    } finally {
      setTerminalLoading(false)
    }
  }, [terminalInput, terminalLoading])

  // Admin Actions
  const banUser = async (userId: string, isBanned: boolean) => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban', userId, isBanned }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned } : u))
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user and all their data?')) return
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', userId }),
    })
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  const updateUserFeatures = async () => {
    if (!selectedUser) return
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateFeatures', userId: selectedUser.id, features: userFeatures }),
    })
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, features: JSON.stringify(userFeatures) } : u))
    setSelectedUser(null)
  }

  const toggleGlobalFeature = (feature: keyof FeatureFlags) => {
    const newFeatures = { ...propFeatures, [feature]: !propFeatures[feature] }
    propSetFeatures(newFeatures)
    localStorage.setItem('nexus_features', JSON.stringify(newFeatures))
    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setGlobalFeatures', features: newFeatures }),
    })
  }

  const featureList: { key: keyof FeatureFlags; name: string; icon: string }[] = [
    { key: 'createImage', name: 'AI Images', icon: '🎨' },
    { key: 'database', name: 'Database', icon: '💾' },
    { key: 'chat', name: 'AI Chat', icon: '💬' },
    { key: 'youtube', name: 'YouTube', icon: '📺' },
    { key: 'tiktok', name: 'TikTok', icon: '🎵' },
    { key: 'tetris', name: 'Games', icon: '🎮' },
    { key: 'p2pChat', name: 'Messages', icon: '✉️' },
    { key: 'invite', name: 'Invites', icon: '🔗' },
    { key: 'spotify', name: 'Spotify', icon: '🎧' },
    { key: 'notifications', name: 'Push', icon: '🔔' },
    { key: 'gameCenter', name: 'Game Center', icon: '🏆' },
    { key: 'memoryVault', name: 'Memory', icon: '🧠' },
  ]

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: '🤖' },
    { id: 'terminal', label: 'Terminal', icon: '💻' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'features', label: 'Features', icon: '⚡' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'backups', label: 'Backups', icon: '💾' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-3xl font-bold text-black mx-auto mb-4 animate-pulse">A</div>
          <p className="text-white/60">Loading Admin Panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            NEXUS Admin Panel
          </h2>
          <p className="text-sm text-white/40">v2.0f • TensorFlow {tfLoaded ? '✅' : '⏳'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
            {stats.totalUsers} users
          </span>
          <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">
            {stats.totalImages} images
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap flex items-center gap-2 transition ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white' 
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard label="Users" value={stats.totalUsers} icon="👥" color="emerald" />
            <StatCard label="Images" value={stats.totalImages} icon="🎨" color="cyan" />
            <StatCard label="Messages" value={stats.totalMessages} icon="💬" color="purple" />
            <StatCard label="P2P" value={stats.totalP2PMessages} icon="✉️" color="pink" />
            <StatCard label="Invites" value={stats.totalInvites} icon="🔗" color="yellow" />
            <StatCard label="Connections" value={stats.activeConnections} icon="🌐" color="blue" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* System Status */}
            <div className="bg-black/40 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Uptime</span>
                  <span className="text-emerald-400">{stats.serverUptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Memory</span>
                  <span className="text-cyan-400">{stats.memoryUsage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">CPU</span>
                  <span className="text-purple-400">{stats.cpuUsage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">TensorFlow.js</span>
                  <span className={tfLoaded ? 'text-emerald-400' : 'text-yellow-400'}>
                    {tfLoaded ? 'Loaded' : 'Loading...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-black/40 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clearCache' }) })}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition"
                >
                  🗑️ Clear Cache
                </button>
                <button 
                  onClick={() => setActiveTab('backups')}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition"
                >
                  💾 Create Backup
                </button>
                <button 
                  onClick={() => setActiveTab('ai-assistant')}
                  className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 rounded-xl text-sm transition"
                >
                  🤖 AI Assistant
                </button>
                <button 
                  onClick={() => setActiveTab('terminal')}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition"
                >
                  💻 Terminal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Tab */}
      {activeTab === 'ai-assistant' && (
        <div className="bg-black/40 rounded-2xl border border-white/10 flex flex-col h-[600px]">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold flex items-center gap-2">
              🤖 NEXUS AI Admin Assistant
              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">Claude Powered</span>
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiMessages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🤖</div>
                <p className="text-white/60 mb-4">Hi! I'm your NEXUS Admin AI Assistant.</p>
                <p className="text-white/40 text-sm">Ask me anything about managing your NEXUS OS!</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['Show user stats', 'Check server health', 'Suggest improvements', 'Help with features'].map(s => (
                    <button
                      key={s}
                      onClick={() => { setAiInput(s); setTimeout(() => sendAiMessage(), 100) }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-sm transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-emerald-500/20 text-emerald-100' 
                    : 'bg-white/5 text-white/90'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs opacity-50 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-3 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendAiMessage()}
                placeholder="Ask AI assistant..."
                className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/50"
              />
              <button
                onClick={sendAiMessage}
                disabled={aiLoading || !aiInput.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Tab */}
      {activeTab === 'terminal' && (
        <div className="bg-black/60 rounded-2xl border border-emerald-500/30 overflow-hidden">
          <div className="bg-emerald-500/10 px-4 py-2 border-b border-emerald-500/30 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-sm text-emerald-400 ml-2">NEXUS Terminal</span>
          </div>
          
          <div className="h-[400px] overflow-y-auto p-4 font-mono text-sm text-emerald-400">
            <p className="text-white/40 mb-2">NEXUS OS Terminal v2.0f</p>
            <p className="text-white/40 mb-4">Type 'help' for available commands</p>
            
            {terminalOutput.map((line, i) => (
              <p key={i} className="mb-1 whitespace-pre-wrap">{line}</p>
            ))}
            
            {terminalLoading && <p className="animate-pulse">...</p>}
          </div>
          
          <div className="p-4 border-t border-white/10 flex gap-2">
            <span className="text-emerald-400">$</span>
            <input
              type="text"
              value={terminalInput}
              onChange={e => setTerminalInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && executeCommand()}
              placeholder="Enter command..."
              className="flex-1 bg-transparent outline-none text-white font-mono"
            />
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold">User Management ({users.length})</h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-white/5 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-sm">User</th>
                  <th className="text-left p-3 text-sm">Images</th>
                  <th className="text-left p-3 text-sm">Messages</th>
                  <th className="text-left p-3 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={`border-t border-white/5 ${u.isBanned ? 'bg-red-500/10' : ''}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-black">
                          {u.username[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {u.username} {u.isAdmin && <span className="text-yellow-400">★</span>}
                          </p>
                          <p className="text-xs text-white/40">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{u._count.generatedImages}</td>
                    <td className="p-3 text-sm">{u._count.sentMessages}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setSelectedUser(u); setUserFeatures({ ...defaultFeatures, ...(u.features ? JSON.parse(u.features) : {}) }) }}
                          className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400"
                        >
                          Features
                        </button>
                        <button 
                          onClick={() => banUser(u.id, !u.isBanned)} 
                          className={`px-2 py-1 rounded text-xs ${u.isBanned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="bg-black/40 rounded-2xl border border-white/10 p-6">
          <h3 className="font-semibold mb-4">Global Features</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {featureList.map(f => (
              <button
                key={f.key}
                onClick={() => toggleGlobalFeature(f.key)}
                className={`p-4 rounded-xl text-left transition ${
                  propFeatures[f.key] 
                    ? 'bg-emerald-500/20 border border-emerald-500/50' 
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{f.icon}</span>
                    <span className="font-medium text-sm">{f.name}</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full ${propFeatures[f.key] ? 'bg-emerald-500' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transform transition ${propFeatures[f.key] ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-black/40 rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold mb-4">📈 Analytics Dashboard</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-emerald-400">{stats.totalUsers}</p>
                <p className="text-sm text-white/60">Total Users</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-cyan-400">{stats.totalImages}</p>
                <p className="text-sm text-white/60">Images Generated</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-purple-400">{stats.totalMessages}</p>
                <p className="text-sm text-white/60">AI Messages</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backups Tab */}
      {activeTab === 'backups' && (
        <div className="bg-black/40 rounded-2xl border border-white/10 p-6">
          <h3 className="font-semibold mb-4">💾 Backup Management</h3>
          <div className="space-y-4">
            <button 
              onClick={async () => {
                const res = await fetch('/api/backup', { method: 'POST' })
                const data = await res.json()
                if (data.success) alert('Backup created successfully!')
              }}
              className="w-full p-4 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 rounded-xl transition"
            >
              Create Full Backup
            </button>
            <button 
              onClick={async () => {
                const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clearCache' }) })
                alert('Cache cleared!')
              }}
              className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl transition"
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-black/40 rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold mb-4">🌐 App URLs</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="https://your-tunnel.trycloudflare.com"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                className="flex-1 p-2 bg-white/10 rounded-lg outline-none text-sm"
              />
              <button 
                onClick={async () => {
                  if (!newUrl.trim()) return
                  const urls = [...appUrls, newUrl.trim()]
                  setAppUrls(urls)
                  setNewUrl('')
                  await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateUrls', urls }) })
                }}
                className="px-4 py-2 bg-cyan-500 rounded-lg text-sm"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {appUrls.map((url, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:underline truncate flex-1">
                    {url}
                  </a>
                  <button 
                    onClick={async () => {
                      const urls = appUrls.filter((_, idx) => idx !== i)
                      setAppUrls(urls)
                      await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateUrls', urls }) })
                    }}
                    className="ml-2 px-2 py-1 text-red-400 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/40 rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold mb-4">🎵 Music Links</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Name"
                value={newMusicName}
                onChange={e => setNewMusicName(e.target.value)}
                className="flex-1 p-2 bg-white/10 rounded-lg outline-none text-sm"
              />
              <input
                type="text"
                placeholder="URL"
                value={newMusicUrl}
                onChange={e => setNewMusicUrl(e.target.value)}
                className="flex-1 p-2 bg-white/10 rounded-lg outline-none text-sm"
              />
              <button 
                onClick={() => {
                  if (!newMusicName.trim() || !newMusicUrl.trim()) return
                  const newLinks = [...musicLinks, { name: newMusicName, url: newMusicUrl }]
                  setMusicLinks(newLinks)
                  localStorage.setItem('nexus_music_links', JSON.stringify(newLinks))
                  setNewMusicName('')
                  setNewMusicUrl('')
                }}
                className="px-4 py-2 bg-red-500 rounded-lg text-sm"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {musicLinks.map((link, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-red-400 text-sm hover:underline">
                    {link.name}
                  </a>
                  <button 
                    onClick={() => {
                      const newLinks = musicLinks.filter((_, idx) => idx !== i)
                      setMusicLinks(newLinks)
                      localStorage.setItem('nexus_music_links', JSON.stringify(newLinks))
                    }}
                    className="px-2 py-1 text-red-400 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Features Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Features: {selectedUser.username}</h3>
              <button onClick={() => setSelectedUser(null)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {featureList.map(f => (
                <button
                  key={f.key}
                  onClick={() => setUserFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                  className={`p-3 rounded-xl text-left transition ${
                    userFeatures[f.key] ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{f.icon}</span>
                    <span className="text-xs">{f.name}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedUser(null)} className="flex-1 py-2 rounded-xl bg-white/10">Cancel</button>
              <button onClick={updateUserFeatures} className="flex-1 py-2 rounded-xl bg-emerald-500">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper Component
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
    pink: 'from-pink-500/20 to-pink-500/5 text-pink-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
  }
  
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-4 border border-white/10`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-white/60">{label}</p>
    </div>
  )
}
