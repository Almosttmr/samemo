const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const syncService = require('./sync-service')

let mainWindow
let tray = null
let isQuitting = false
let configPath = path.join(app.getPath('userData'), 'config.json')
let dataPath = path.join(app.getPath('userData'), 'memos.json')
let trashPath = path.join(app.getPath('userData'), 'trash.json')

const store = new Store()

const defaultConfig = {
  opacity: 0.85,
  alwaysOnTop: true,
  width: 320,
  height: 500,
  x: null,
  y: null,
  openAtLogin: false,
  minimizeToTray: true,
  shortcutKey: 'CommandOrControl+Shift+M'
}

// 单实例锁定，防止多开
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 已有实例存在，使用 app.exit(0) 强制立即退出进程
  // app.quit() 在 app.ready 之前调用会等待初始化，导致"卡住"
  console.log('已有实例存在，立即退出当前实例')
  app.exit(0)
}

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return { ...defaultConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) }
    }
  } catch (e) {
    console.error('Load config error:', e)
  }
  return defaultConfig
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (e) {
    console.error('Save config error:', e)
  }
}

function loadMemos() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    }
  } catch (e) {
    console.error('Load memos error:', e)
  }
  return []
}

function saveMemos(memos) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(memos, null, 2))
  } catch (e) {
    console.error('Save memos error:', e)
  }
}

function loadTrash() {
  try {
    if (fs.existsSync(trashPath)) {
      return JSON.parse(fs.readFileSync(trashPath, 'utf8'))
    }
  } catch (e) {
    console.error('Load trash error:', e)
  }
  return {}
}

function saveTrash(trash) {
  try {
    fs.writeFileSync(trashPath, JSON.stringify(trash, null, 2))
  } catch (e) {
    console.error('Save trash error:', e)
  }
}

// 注册全局快捷键
function registerShortcut(accelerator) {
  // 先注销所有快捷键
  globalShortcut.unregisterAll()
  
  if (accelerator) {
    try {
      const ret = globalShortcut.register(accelerator, () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide()
          } else {
            mainWindow.show()
            mainWindow.focus()
          }
        }
      })
      
      if (!ret) {
        console.error('快捷键注册失败:', accelerator)
        return false
      }
      console.log('快捷键注册成功:', accelerator)
      return true
    } catch (e) {
      console.error('快捷键注册错误:', e)
      return false
    }
  }
  return true
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png')
  
  let trayIcon
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
  } else {
    trayIcon = nativeImage.createEmpty()
  }
  
  if (trayIcon.isEmpty()) {
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADlSURBVDiNpZMxDoMwDEV/KCxpaWnhBDyDn8AlOASXwCV4BS/BKXgFF8ElcQneQqVU0UZ6m9lYFvDuj//+MzObGIZBkiR8jwMpilJ8A1VVqaoaWZZFGYZBmqY8j8NRFJ7nIQgClmUhiAIYhlEoFAqFQqVSCcuy0jRNlMvlcrkcYRg6n8/lUqlUKpVKpVIpxWKxWCwWDAaDwWAwGAyGw+VyeZ5nWZb5fD6bzWaz2Ww2m81ms9lstdlsNpvNZrPZbDa7Xq/X6/V6vV6v1+v1er1er9fr9Xq9Xq/X6/1+v1+v1+v1+r1er9fr9Xq9Xq/X6/V6vV6v1+v1er1er9fr9Xq9Xq/X6/V6vV6v1+v1er1er9fr9Xq9Xq/X6/V6vV6v1+v1er1er9fr9Xq9Xq/X6/V6vV4L+AMODgA2wQNGhgAAAABJRU5ErkJggg==')
  }
  
  tray = new Tray(trayIcon)
  
  const config = loadConfig()
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide()
          } else {
            mainWindow.show()
            mainWindow.focus()
          }
        }
      }
    },
    {
      label: '开机自启动',
      type: 'checkbox',
      checked: config.openAtLogin,
      click: (menuItem) => {
        const cfg = loadConfig()
        cfg.openAtLogin = menuItem.checked
        saveConfig(cfg)
        app.setLoginItemSettings({ openAtLogin: menuItem.checked })
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('桌面备忘录')
  tray.setContextMenu(contextMenu)
  
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

function createWindow() {
  const config = loadConfig()
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  
  let x = config.x !== null ? config.x : width - config.width - 20
  let y = config.y !== null ? config.y : 20

  mainWindow = new BrowserWindow({
    width: config.width,
    height: config.height,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: config.alwaysOnTop,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')

  mainWindow.on('close', (event) => {
    const config = loadConfig()
    if (!isQuitting && config.minimizeToTray) {
      event.preventDefault()
      mainWindow.hide()
    } else {
      const bounds = mainWindow.getBounds()
      saveConfig({
        ...config,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      })
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 在 app.whenReady() 中注册 second-instance 事件（最佳实践）
app.whenReady().then(() => {
  console.log('应用已就绪，注册 second-instance 事件')
  
  // 当第二个实例尝试启动时，第一个实例收到此事件
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('收到 second-instance 事件')
    // 当尝试打开第二个实例时，显示并聚焦到已有窗口
    if (mainWindow) {
      console.log('mainWindow 存在，准备显示窗口')
      // 如果窗口最小化，先恢复
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      // 如果窗口隐藏，显示窗口
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      // 强制将窗口置顶显示
      mainWindow.setAlwaysOnTop(true)
      mainWindow.focus()
      // 恢复原来的置顶设置
      const config = loadConfig()
      mainWindow.setAlwaysOnTop(config.alwaysOnTop)
      console.log('窗口已显示并聚焦')
    } else {
      console.log('mainWindow 不存在')
    }
  })
  
  const config = loadConfig()
  
  // 设置开机自启动
  app.setLoginItemSettings({ openAtLogin: config.openAtLogin })
  
  // 注册全局快捷键
  registerShortcut(config.shortcutKey)
  
  createTray()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
  // 退出时注销所有快捷键
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('get-memos', () => {
  return loadMemos()
})

ipcMain.handle('save-memos', (event, memos) => {
  saveMemos(memos)
  return true
})

ipcMain.handle('get-config', () => {
  return loadConfig()
})

ipcMain.handle('save-config', (event, newConfig) => {
  const config = loadConfig()
  const updated = { ...config, ...newConfig }
  saveConfig(updated)
  
  if (mainWindow && newConfig.opacity !== undefined) {
    mainWindow.webContents.send('opacity-changed', newConfig.opacity)
  }
  if (mainWindow && newConfig.alwaysOnTop !== undefined) {
    mainWindow.setAlwaysOnTop(newConfig.alwaysOnTop)
  }
  if (newConfig.openAtLogin !== undefined) {
    app.setLoginItemSettings({ openAtLogin: newConfig.openAtLogin })
    // 更新托盘菜单
    if (tray) {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '显示/隐藏窗口',
          click: () => {
            if (mainWindow) {
              if (mainWindow.isVisible()) {
                mainWindow.hide()
              } else {
                mainWindow.show()
                mainWindow.focus()
              }
            }
          }
        },
        {
          label: '开机自启动',
          type: 'checkbox',
          checked: newConfig.openAtLogin,
          click: (menuItem) => {
            const cfg = loadConfig()
            cfg.openAtLogin = menuItem.checked
            saveConfig(cfg)
            app.setLoginItemSettings({ openAtLogin: menuItem.checked })
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }
      ])
      tray.setContextMenu(contextMenu)
    }
  }
  // 更新快捷键
  if (newConfig.shortcutKey !== undefined) {
    registerShortcut(newConfig.shortcutKey)
  }
  return true
})

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('get-trash', () => {
  return loadTrash()
})

ipcMain.handle('save-trash', (event, trash) => {
  saveTrash(trash)
  return true
})

ipcMain.handle('show-window', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

ipcMain.handle('toggle-window', () => {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  }
})

ipcMain.handle('sync-init', async () => {
  const credentials = syncService.getStoredCredentials(store)
  if (credentials.url && credentials.anonKey) {
    syncService.initSupabase(credentials.url, credentials.anonKey, store)
    const session = await syncService.getSession()
    return {
      configured: true,
      loggedIn: !!session,
      user: session?.user || null
    }
  }
  return { configured: false, loggedIn: false, user: null }
})

ipcMain.handle('sync-set-credentials', async (event, url, anonKey) => {
  syncService.setStoredCredentials(store, url, anonKey)
  const success = syncService.initSupabase(url, anonKey, store)
  return { success }
})

ipcMain.handle('sync-sign-in', async (event, email, password) => {
  return await syncService.signIn(email, password)
})

ipcMain.handle('sync-sign-up', async (event, email, password) => {
  return await syncService.signUp(email, password)
})

ipcMain.handle('sync-sign-out', async () => {
  return await syncService.signOut()
})

ipcMain.handle('sync-get-session', async () => {
  const session = await syncService.getSession()
  return session
})

ipcMain.handle('sync-upload-all', async () => {
  const memos = loadMemos()
  const config = loadConfig()
  const trash = loadTrash()
  return await syncService.syncAll(memos, config, trash)
})

ipcMain.handle('sync-download-all', async () => {
  return await syncService.downloadAll()
})

ipcMain.handle('sync-upload-memos', async () => {
  const memos = loadMemos()
  return await syncService.uploadMemos(memos)
})

ipcMain.handle('sync-download-memos', async () => {
  return await syncService.downloadMemos()
})

ipcMain.handle('sync-upload-config', async () => {
  const config = loadConfig()
  return await syncService.uploadConfig(config)
})

ipcMain.handle('sync-download-config', async () => {
  return await syncService.downloadConfig()
})

ipcMain.handle('sync-upload-trash', async () => {
  const trash = loadTrash()
  return await syncService.uploadTrash(trash)
})

ipcMain.handle('sync-download-trash', async () => {
  return await syncService.downloadTrash()
})
