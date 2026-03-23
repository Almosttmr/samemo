const { createClient } = require('@supabase/supabase-js')

let supabase = null
let currentUser = null

const SUPABASE_URL_KEY = 'supabase_url'
const SUPABASE_ANON_KEY = 'supabase_anon_key'

function getStoredCredentials(store) {
  return {
    url: store.get(SUPABASE_URL_KEY) || '',
    anonKey: store.get(SUPABASE_ANON_KEY) || ''
  }
}

function setStoredCredentials(store, url, anonKey) {
  store.set(SUPABASE_URL_KEY, url)
  store.set(SUPABASE_ANON_KEY, anonKey)
}

function initSupabase(url, anonKey, store = null) {
  if (!url || !anonKey) {
    supabase = null
    return false
  }
  
  try {
    supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: store ? {
          getItem: (key) => store.get(key),
          setItem: (key, value) => store.set(key, value),
          removeItem: (key) => store.delete(key)
        } : undefined
      }
    })
    return true
  } catch (error) {
    console.error('Failed to initialize Supabase:', error)
    supabase = null
    return false
  }
}

async function getSession() {
  if (!supabase) return null
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Get session error:', error)
      return null
    }
    currentUser = session?.user || null
    return session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

async function signIn(email, password) {
  if (!supabase) {
    return { success: false, error: 'Supabase 未初始化' }
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    currentUser = data.user
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function signUp(email, password) {
  if (!supabase) {
    return { success: false, error: 'Supabase 未初始化' }
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    currentUser = data.user
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function signOut() {
  if (!supabase) {
    return { success: false, error: 'Supabase 未初始化' }
  }
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { success: false, error: error.message }
    }
    
    currentUser = null
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function getCurrentUser() {
  return currentUser
}

function isConfigured() {
  return supabase !== null
}

async function uploadMemos(memos) {
  if (!supabase || !currentUser) {
    return { success: false, error: '未登录' }
  }
  
  try {
    const memosData = memos.map(memo => ({
      id: memo.id,
      user_id: currentUser.id,
      text: memo.text || '',
      completed: memo.completed || false,
      priority: memo.priority,
      created_at: new Date(memo.createdAt).toISOString(),
      updated_at: memo.updatedAt ? new Date(memo.updatedAt).toISOString() : null,
      completed_at: memo.completedAt ? new Date(memo.completedAt).toISOString() : null
    }))
    
    const { error: deleteError } = await supabase
      .from('memos')
      .delete()
      .eq('user_id', currentUser.id)
    
    if (deleteError) {
      console.error('Delete memos error:', deleteError)
    }
    
    if (memosData.length > 0) {
      const { error: insertError } = await supabase
        .from('memos')
        .insert(memosData)
      
      if (insertError) {
        return { success: false, error: insertError.message }
      }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function downloadMemos() {
  if (!supabase || !currentUser) {
    return { success: false, error: '未登录' }
  }
  
  try {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    const memos = data.map(item => ({
      id: item.id,
      text: item.text,
      completed: item.completed,
      priority: item.priority,
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : null,
      completedAt: item.completed_at ? new Date(item.completed_at).getTime() : null
    }))
    
    return { success: true, data: memos }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function uploadConfig(config) {
  if (!supabase || !currentUser) {
    return { success: false, error: '未登录' }
  }
  
  try {
    const configData = {
      user_id: currentUser.id,
      opacity: config.opacity,
      always_on_top: config.alwaysOnTop,
      width: config.width,
      height: config.height,
      open_at_login: config.openAtLogin,
      minimize_to_tray: config.minimizeToTray,
      shortcut_key: config.shortcutKey,
      updated_at: new Date().toISOString()
    }
    
    const { data: existing } = await supabase
      .from('configs')
      .select('id')
      .eq('user_id', currentUser.id)
      .single()
    
    if (existing) {
      const { error } = await supabase
        .from('configs')
        .update(configData)
        .eq('user_id', currentUser.id)
      
      if (error) {
        return { success: false, error: error.message }
      }
    } else {
      const { error } = await supabase
        .from('configs')
        .insert(configData)
      
      if (error) {
        return { success: false, error: error.message }
      }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function downloadConfig() {
  if (!supabase || !currentUser) {
    return { success: false, error: '未登录' }
  }
  
  try {
    const { data, error } = await supabase
      .from('configs')
      .select('*')
      .eq('user_id', currentUser.id)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message }
    }
    
    if (!data) {
      return { success: true, data: null }
    }
    
    const config = {
      opacity: data.opacity,
      alwaysOnTop: data.always_on_top,
      width: data.width,
      height: data.height,
      openAtLogin: data.open_at_login,
      minimizeToTray: data.minimize_to_tray,
      shortcutKey: data.shortcut_key
    }
    
    return { success: true, data: config }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function uploadTrash(trash) {
  if (!supabase || !currentUser) {
    return { success: false, error: '未登录' }
  }
  
  try {
    const { error: deleteError } = await supabase
      .from('trash')
      .delete()
      .eq('user_id', currentUser.id)
    
    if (deleteError) {
      console.error('Delete trash error:', deleteError)
    }
    
    const trashData = []
    Object.keys(trash).forEach(dateKey => {
      const items = trash[dateKey] || []
      items.forEach(item => {
        trashData.push({
          id: item.id,
          user_id: currentUser.id,
          text: item.text || '',
          completed: item.completed || false,
          priority: item.priority,
          created_at: new Date(item.createdAt).toISOString(),
          deleted_at: new Date(item.deletedAt).toISOString(),
          date_key: dateKey
        })
      })
    })
    
    if (trashData.length > 0) {
      const { error: insertError } = await supabase
        .from('trash')
        .insert(trashData)
      
      if (insertError) {
        return { success: false, error: insertError.message }
      }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function downloadTrash() {
  if (!supabase || !currentUser) {
    return { success: false, error: '未登录' }
  }
  
  try {
    const { data, error } = await supabase
      .from('trash')
      .select('*')
      .eq('user_id', currentUser.id)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    const trash = {}
    data.forEach(item => {
      const dateKey = item.date_key
      if (!trash[dateKey]) {
        trash[dateKey] = []
      }
      trash[dateKey].push({
        id: item.id,
        text: item.text,
        completed: item.completed,
        priority: item.priority,
        createdAt: new Date(item.created_at).getTime(),
        deletedAt: new Date(item.deleted_at).getTime()
      })
    })
    
    return { success: true, data: trash }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function syncAll(memos, config, trash) {
  if (!supabase || !currentUser) {
    return { success: false, error: '未登录' }
  }
  
  try {
    const [memosResult, configResult, trashResult] = await Promise.all([
      uploadMemos(memos),
      uploadConfig(config),
      uploadTrash(trash)
    ])
    
    const errors = []
    if (!memosResult.success) errors.push(`备忘录: ${memosResult.error}`)
    if (!configResult.success) errors.push(`配置: ${configResult.error}`)
    if (!trashResult.success) errors.push(`垃圾桶: ${trashResult.error}`)
    
    if (errors.length > 0) {
      return { success: false, error: errors.join('; ') }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function downloadAll() {
  if (!supabase || !currentUser) {
    return { success: false, error: '未登录' }
  }
  
  try {
    const [memosResult, configResult, trashResult] = await Promise.all([
      downloadMemos(),
      downloadConfig(),
      downloadTrash()
    ])
    
    return {
      success: true,
      data: {
        memos: memosResult.success ? memosResult.data : [],
        config: configResult.success ? configResult.data : null,
        trash: trashResult.success ? trashResult.data : {}
      }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

module.exports = {
  initSupabase,
  getStoredCredentials,
  setStoredCredentials,
  getSession,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  isConfigured,
  uploadMemos,
  downloadMemos,
  uploadConfig,
  downloadConfig,
  uploadTrash,
  downloadTrash,
  syncAll,
  downloadAll
}
