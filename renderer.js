// ==================== 全局变量 ====================

let memos = []                  // 存储所有备忘录数据的数组
let config = {}                 // 存储应用配置的对象
let trash = {}                  // 存储垃圾桶数据，按日期分类
let selectedTrashItems = new Set()  // 存储选中的垃圾桶项目
let editingMemoId = null        // 当前正在编辑的备忘录ID，用于临时置顶

const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']  // 星期数组
// ==================== 时间格式化函数 ====================
// 将时间戳格式化为 "月/日 时:分" 格式
function formatTime(timestamp) {
  const date = new Date(timestamp)  // 创建日期对象
  const month = String(date.getMonth() + 1).padStart(2, '0')  // 获取月份并补零
  const day = String(date.getDate()).padStart(2, '0')  // 获取日期并补零
  const hours = String(date.getHours()).padStart(2, '0')  // 获取小时并补零
  const minutes = String(date.getMinutes()).padStart(2, '0')  // 获取分钟并补零
  return `${month}/${day} ${hours}:${minutes}`  // 返回格式化后的时间字符串
}
// 将时间戳格式化为 "年/月/日" 格式
function formatDate(timestamp) {
  const date = new Date(timestamp)  // 创建日期对象
  const year = date.getFullYear()  // 获取年份
  const month = String(date.getMonth() + 1).padStart(2, '0')  // 获取月份并补零
  const day = String(date.getDate()).padStart(2, '0')  // 获取日期并补零
  return `${year}/${month}/${day}`  // 返回格式化后的日期字符串
}
// 获取日期键值 "年/月/日" 格式，用于垃圾桶按日期分类
function getDateKey(timestamp) {
  const date = new Date(timestamp)  // 创建日期对象
  const year = date.getFullYear()  // 获取年份
  const month = String(date.getMonth() + 1).padStart(2, '0')  // 获取月份并补零
  const day = String(date.getDate()).padStart(2, '0')  // 获取日期并补零
  return `${year}/${month}/${day}`  // 返回日期键值
}
// ==================== 日期显示函数 ====================
// 更新标题栏的日期显示
function updateDate() {
  const now = new Date()  // 获取当前时间
  const year = now.getFullYear()  // 获取年份
  const month = String(now.getMonth() + 1).padStart(2, '0')  // 获取月份并补零
  const day = String(now.getDate()).padStart(2, '0')  // 获取日期并补零
  const weekday = weekdays[now.getDay()]  // 获取星期
  
  const dateDisplay = document.getElementById('dateDisplay')  // 获取日期显示元素
  dateDisplay.innerHTML = `
    <span class="weekday">${weekday}</span>
    <span class="date">${year}/${month}/${day}</span>
  `  // 更新日期显示内容
}
// ==================== ID生成函数 ====================
// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)  // 使用时间戳和随机数生成唯一ID
}
// ==================== 备忘录渲染函数 ====================
// 渲染单个备忘录项
function renderMemo(memo) {
  const div = document.createElement('div')  // 创建div元素
  div.className = `memo-item ${memo.completed ? 'completed' : ''}`  // 设置CSS类名
  div.dataset.id = memo.id  // 设置data-id属性
  
  const priorityClass = memo.priority ? `priority-${memo.priority}` : ''  // 优先级CSS类名
  const createdTime = formatTime(memo.createdAt)  // 格式化创建时间
  
  div.innerHTML = `
    <div class="priority-indicator ${priorityClass}"></div>
    <div class="memo-checkbox ${memo.completed ? 'checked' : ''}" data-action="toggle"></div>
    <div class="memo-text-wrapper">
      <div class="memo-text" contenteditable="true" data-action="edit">${memo.text}</div>
      <div class="memo-meta">
        <div class="memo-priority">
          <button class="priority-btn high ${memo.priority === 'high' ? 'active' : ''}" data-priority="high" title="高优先级"></button>
          <button class="priority-btn medium ${memo.priority === 'medium' ? 'active' : ''}" data-priority="medium" title="中优先级"></button>
          <button class="priority-btn low ${memo.priority === 'low' ? 'active' : ''}" data-priority="low" title="低优先级"></button>
        </div>
        <div class="memo-created-time">${createdTime}</div>
      </div>
    </div>
    <button class="memo-delete" data-action="delete">×</button>
  `  // 设置HTML内容
  
  return div  // 返回创建的元素
}
// 渲染所有备忘录
function renderMemos() {
  const memoList = document.getElementById('memoList')  // 获取备忘录列表容器
  memoList.innerHTML = ''  // 清空内容
  
  // 排序备忘录：正在编辑的置顶，然后按完成状态、优先级、创建时间排序
  const sortedMemos = [...memos].sort((a, b) => {
    // 正在编辑的备忘录置顶
    if (a.id === editingMemoId) return -1
    if (b.id === editingMemoId) return 1
    
    // 先按完成状态排序：未完成的在前
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    
    // 未完成的按优先级排序
    const priorityOrder = { high: 0, medium: 1, low: 2, undefined: 3 }  // 优先级排序权重
    const pa = priorityOrder[a.priority] ?? 3  // 获取a的优先级权重
    const pb = priorityOrder[b.priority] ?? 3  // 获取b的优先级权重
    if (pa !== pb) return pa - pb  // 按优先级排序
    
    return b.createdAt - a.createdAt  // 新创建的在前
  })
  
  sortedMemos.forEach(memo => {
    memoList.appendChild(renderMemo(memo))  // 逐个添加备忘录项
  })
}
// ==================== 备忘录操作函数 ====================
// 添加新备忘录
function addMemo() {
  const memo = {
    id: generateId(),  // 生成唯一ID
    text: '',  // 初始文本为空
    completed: false,  // 初始未完成
    priority: null,  // 初始无优先级
    createdAt: Date.now()  // 创建时间戳
  }
  memos.unshift(memo)  // 添加到数组开头
  editingMemoId = memo.id  // 设置当前编辑的备忘录ID
  saveMemos()  // 保存到存储
  renderMemos()  // 重新渲染
  
  const firstItem = document.querySelector('.memo-item')  // 获取第一个备忘录项
  if (firstItem) {
    const textEl = firstItem.querySelector('.memo-text')  // 获取文本元素
    textEl.focus()  // 聚焦以便输入
  }
}
// 切换备忘录完成状态
function toggleMemo(id) {
  const memo = memos.find(m => m.id === id)  // 查找对应备忘录
  if (memo) {
    memo.completed = !memo.completed  // 切换完成状态
    memo.completedAt = memo.completed ? Date.now() : null  // 设置完成时间
    saveMemos()  // 保存
    renderMemos()  // 重新渲染
  }
}
// 删除备忘录（移入垃圾桶）
function deleteMemo(id) {
  const memo = memos.find(m => m.id === id)  // 查找对应备忘录
  if (memo) {
    // 如果删除的是正在编辑的备忘录，清除编辑状态
    if (id === editingMemoId) {
      editingMemoId = null
    }
    
    const dateKey = getDateKey(memo.createdAt)  // 获取日期键值
    if (!trash[dateKey]) {
      trash[dateKey] = []  // 创建该日期的垃圾桶数组
    }
    trash[dateKey].push({
      ...memo,  // 复制备忘录内容
      deletedAt: Date.now()  // 添加删除时间
    })
    saveTrash()  // 保存垃圾桶
    
    memos = memos.filter(m => m.id !== id)  // 从备忘录中移除
    saveMemos()  // 保存备忘录
    renderMemos()  // 重新渲染
  }
}
// 更新备忘录文本
function updateMemoText(id, text) {
  const memo = memos.find(m => m.id === id)  // 查找对应备忘录
  if (memo) {
    memo.text = text  // 更新文本
    memo.updatedAt = Date.now()  // 更新时间戳
    saveMemos()  // 保存
  }
}
// 更新备忘录优先级
function updateMemoPriority(id, priority) {
  const memo = memos.find(m => m.id === id)  // 查找对应备忘录
  if (memo) {
    memo.priority = memo.priority === priority ? null : priority  // 切换优先级
    saveMemos()  // 保存
    renderMemos()  // 重新渲染
  }
}
// ==================== 数据存储函数 ====================
// 保存备忘录到存储
async function saveMemos() {
  await window.api.saveMemos(memos)
}
// 从存储加载备忘录
async function loadMemos() {
  memos = await window.api.getMemos()
  renderMemos()
}
// 从存储加载垃圾桶
async function loadTrash() {
  trash = await window.api.getTrash()
}
// 格式化快捷键显示
function formatShortcut(accelerator) {
  if (!accelerator) return ''
  return accelerator
    .replace('CommandOrControl', 'Ctrl')
    .replace('Command', 'Cmd')
    .replace('Control', 'Ctrl')
    .replace(/\+/g, ' + ')
}
// 加载配置
async function loadConfig() {
  config = await window.api.getConfig()
  
  document.getElementById('opacitySlider').value = config.opacity  // 设置透明度滑块值
  document.getElementById('opacityValue').textContent = Math.round(config.opacity * 100) + '%'  // 显示透明度百分比
  document.getElementById('alwaysOnTop').checked = config.alwaysOnTop  // 设置置顶复选框
  document.getElementById('openAtLogin').checked = config.openAtLogin || false  // 设置开机自启动复选框
  document.getElementById('shortcutKey').value = formatShortcut(config.shortcutKey || 'CommandOrControl+Shift+M')  // 设置快捷键显示
  updateBackgroundOpacity(config.opacity)  // 更新背景透明度
}
// 更新背景透明度
function updateBackgroundOpacity(opacity) {
  document.documentElement.style.setProperty('--bg-opacity', opacity)  // 设置背景透明度
  document.documentElement.style.setProperty('--header-opacity', Math.min(opacity + 0.1, 1))  // header透明度略高
}
// 保存配置
async function saveConfig(newConfig) {
  await window.api.saveConfig(newConfig)
  config = { ...config, ...newConfig }
}
// 透明度变化回调
window.api.onOpacityChanged((opacity) => {
  updateBackgroundOpacity(opacity)
})
// 保存垃圾桶
async function saveTrash() {
  await window.api.saveTrash(trash)
}
// ==================== 垃圾桶渲染函数 ====================
// 渲染垃圾桶主面板（支持搜索）
function renderTrashPanel(searchKeyword = '') {
  const trashContent = document.getElementById('trashContent')  // 获取垃圾桶内容容器
  trashContent.innerHTML = ''  // 清空内容
  selectedTrashItems.clear()  // 清空选中项
  updateDeleteButton()  // 更新删除按钮显示状态
  
  const dates = Object.keys(trash).sort((a, b) => new Date(b) - new Date(a))  // 按日期降序排列
  
  if (dates.length === 0) {
    trashContent.innerHTML = '<div class="trash-empty">垃圾桶是空的</div>'  // 显示空提示
    return
  }
  
  // 如果有搜索关键词，搜索所有备忘录
  if (searchKeyword.trim()) {
    const keyword = searchKeyword.toLowerCase().trim()
    const searchResults = []
    
    dates.forEach(dateKey => {
      const items = trash[dateKey] || []
      items.forEach(item => {
        if (item.text && item.text.toLowerCase().includes(keyword)) {
          searchResults.push({
            ...item,
            dateKey: dateKey
          })
        }
      })
    })
    
    if (searchResults.length === 0) {
      trashContent.innerHTML = '<div class="trash-empty">未找到匹配的备忘录</div>'
      return
    }
    
    // 显示搜索结果
    const resultHeader = document.createElement('div')
    resultHeader.className = 'trash-search-result-header'
    resultHeader.innerHTML = `<span>找到 ${searchResults.length} 条结果</span>`
    trashContent.appendChild(resultHeader)
    
    searchResults.forEach(item => {
      const div = document.createElement('div')
      div.className = 'trash-item'
      div.dataset.id = item.id
      div.innerHTML = `
        <div class="trash-item-checkbox" data-id="${item.id}"></div>
        <div class="trash-item-content">
          <div class="trash-item-text">${highlightKeyword(item.text || '(空)', keyword)}</div>
          <div class="trash-item-times">
            <div class="trash-item-time">
              <span>日期:</span>
              <span>${item.dateKey}</span>
            </div>
            <div class="trash-item-time">
              <span>删除:</span>
              <span>${formatTime(item.deletedAt)}</span>
            </div>
          </div>
        </div>
      `
      trashContent.appendChild(div)
    })
    return
  }
  
  // 正常显示日期文件夹
  dates.forEach(dateKey => {
    const items = trash[dateKey]
    if (!items || items.length === 0) return  // 跳过空日期
    
    const folder = document.createElement('div')  // 创建文件夹元素
    folder.className = 'trash-folder'
    folder.innerHTML = `
      <div class="trash-folder-header" data-date="${dateKey}">
        <span class="trash-folder-name">${dateKey}</span>
        <span class="trash-folder-count">${items.length} 条</span>
      </div>
    `
    
    // 点击文件夹头部打开日期详情
    folder.querySelector('.trash-folder-header').addEventListener('click', () => {
      openDatePanel(dateKey)
    })
    
    trashContent.appendChild(folder)
  })
}

// 高亮关键词
function highlightKeyword(text, keyword) {
  if (!keyword || !text) return text
  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

// 转义正则特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
// 打开日期详情面板
function openDatePanel(dateKey) {
  const items = trash[dateKey] || []  // 获取该日期的垃圾桶项目
  const trashDatePanel = document.getElementById('trashDatePanel')
  const trashDateContent = document.getElementById('trashDateContent')
  const trashDateTitle = document.getElementById('trashDateTitle')
  
  trashDateTitle.textContent = dateKey  // 设置标题
  trashDateContent.innerHTML = ''  // 清空内容
  selectedTrashItems.clear()  // 清空选中项
  updateDeleteButtonDate()  // 更新删除按钮
  
  if (items.length === 0) {
    trashDateContent.innerHTML = '<div class="trash-empty">没有记录</div>'
  } else {
    items.forEach(item => {
      const div = document.createElement('div')
      div.className = 'trash-item'
      div.dataset.id = item.id
      div.innerHTML = `
        <div class="trash-item-checkbox" data-id="${item.id}"></div>
        <div class="trash-item-content">
          <div class="trash-item-text">${item.text || '(空)'}</div>
          <div class="trash-item-times">
            <div class="trash-item-time">
              <span>创建:</span>
              <span>${formatTime(item.createdAt)}</span>
            </div>
            <div class="trash-item-time">
              <span>删除:</span>
              <span>${formatTime(item.deletedAt)}</span>
            </div>
          </div>
        </div>
      `
      trashDateContent.appendChild(div)
    })
  }
  
  trashDatePanel.classList.add('open')  // 显示日期详情面板
}
// 更新垃圾桶主面板的删除按钮显示状态
function updateDeleteButton() {
  const btn = document.getElementById('btnDeleteSelected')
  btn.style.display = selectedTrashItems.size > 0 ? 'block' : 'none'
}
// 更新日期详情面板的删除按钮显示状态
function updateDeleteButtonDate() {
  const btn = document.getElementById('btnDeleteSelectedDate')
  btn.style.display = selectedTrashItems.size > 0 ? 'block' : 'none'
}
// ==================== 事件监听器 ====================
// 备忘录列表点击事件
document.getElementById('memoList').addEventListener('click', (e) => {
  const memoItem = e.target.closest('.memo-item')  // 获取最近的备忘录项
  if (!memoItem) return  // 如果没有找到，直接返回
  
  const id = memoItem.dataset.id  // 获取备忘录ID
  const action = e.target.dataset.action  // 获取操作类型
  
  if (action === 'toggle') {
    toggleMemo(id)  // 切换完成状态
  } else if (action === 'delete') {
    deleteMemo(id)  // 删除备忘录
  } else if (e.target.dataset.priority) {
    // 点击优先级按钮时，取消 focusout 的延迟定时器
    if (focusoutTimeout) {
      clearTimeout(focusoutTimeout)
      focusoutTimeout = null
    }
    // 保持编辑状态
    const wasEditing = editingMemoId
    updateMemoPriority(id, e.target.dataset.priority)  // 更新优先级
    // 恢复编辑状态
    if (wasEditing === id) {
      editingMemoId = id
      // 重新聚焦到文本框
      setTimeout(() => {
        const textEl = memoItem.querySelector('.memo-text')
        if (textEl) textEl.focus()
      }, 0)
    }
  }
})
// 备忘录列表输入事件
document.getElementById('memoList').addEventListener('input', (e) => {
  if (e.target.classList.contains('memo-text')) {
    const memoItem = e.target.closest('.memo-item')
    if (memoItem) {
      updateMemoText(memoItem.dataset.id, e.target.textContent)  // 更新文本内容
    }
  }
})
// 备忘录列表焦点事件（失去焦点时清除编辑状态）
let focusoutTimeout = null
document.getElementById('memoList').addEventListener('focusout', (e) => {
  if (e.target.classList.contains('memo-text')) {
    const memoItem = e.target.closest('.memo-item')
    if (memoItem && memoItem.dataset.id === editingMemoId) {
      // 延迟清除编辑状态，以便点击优先级按钮的事件可以正常触发
      focusoutTimeout = setTimeout(() => {
        // 如果还在编辑状态，说明没有点击优先级按钮
        if (editingMemoId === memoItem.dataset.id) {
          editingMemoId = null  // 清除编辑状态
          renderMemos()  // 重新渲染以恢复正常排序
        }
      }, 100)
    }
  }
})
// 备忘录列表焦点事件（获得焦点时设置编辑状态）
document.getElementById('memoList').addEventListener('focusin', (e) => {
  if (e.target.classList.contains('memo-text')) {
    const memoItem = e.target.closest('.memo-item')
    if (memoItem) {
      editingMemoId = memoItem.dataset.id  // 设置编辑状态
    }
  }
})
// 备忘录列表键盘事件
document.getElementById('memoList').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.classList.contains('memo-text')) {
    e.preventDefault()  // 阻止默认行为
    const memoItem = e.target.closest('.memo-item')
    
    if (e.target.textContent.trim() === '') {
      deleteMemo(memoItem.dataset.id)  // 如果文本为空，删除备忘录
    }
    
    editingMemoId = null  // 清除当前编辑状态
    addMemo()  // 添加新备忘录
  }
  
  if (e.key === 'Escape' && e.target.classList.contains('memo-text')) {
    editingMemoId = null  // 清除编辑状态
    e.target.blur()  // 取消焦点
    renderMemos()  // 重新渲染以恢复正常排序
  }
})
// 添加按钮点击事件
document.getElementById('addBtn').addEventListener('click', addMemo)
// 设置按钮点击事件
document.getElementById('btnSettings').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.add('open')  // 打开设置面板
})
// 关闭设置按钮点击事件
document.getElementById('btnCloseSettings').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.remove('open')  // 关闭设置面板
})
// 透明度滑块输入事件
document.getElementById('opacitySlider').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value)  // 获取滑块值
  document.getElementById('opacityValue').textContent = Math.round(value * 100) + '%'  // 更新显示
  updateBackgroundOpacity(value)  // 更新背景透明度
  saveConfig({ opacity: value })  // 保存配置
})
// 置顶复选框变化事件
document.getElementById('alwaysOnTop').addEventListener('change', (e) => {
  saveConfig({ alwaysOnTop: e.target.checked })  // 保存置顶设置
})
// 开机自启动复选框变化事件
document.getElementById('openAtLogin').addEventListener('change', (e) => {
  saveConfig({ openAtLogin: e.target.checked })  // 保存开机自启动设置
})
// 快捷键输入框事件
const shortcutKeyInput = document.getElementById('shortcutKey')
const btnResetShortcut = document.getElementById('btnResetShortcut')

// 监听快捷键输入
shortcutKeyInput.addEventListener('keydown', (e) => {
  e.preventDefault()
  
  const keys = []
  
  // 检测修饰键
  if (e.ctrlKey) keys.push('Ctrl')
  if (e.altKey) keys.push('Alt')
  if (e.shiftKey) keys.push('Shift')
  if (e.metaKey) keys.push('Meta')
  
  // 检测主键
  const key = e.key.toUpperCase()
  if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) {
    keys.push(key)
  }
  
  // 至少需要一个修饰键和一个主键
  if (keys.length >= 2 && !['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) {
    const accelerator = keys.join('+')
      .replace('Ctrl', 'CommandOrControl')
    
    shortcutKeyInput.value = formatShortcut(accelerator)
    saveConfig({ shortcutKey: accelerator })
  }
})

// 重置快捷键按钮
btnResetShortcut.addEventListener('click', () => {
  const defaultShortcut = 'CommandOrControl+Shift+M'
  shortcutKeyInput.value = formatShortcut(defaultShortcut)
  saveConfig({ shortcutKey: defaultShortcut })
})
// 清空所有按钮点击事件
document.getElementById('btnClearAll').addEventListener('click', () => {
  if (confirm('确定要清空所有备忘吗？')) {
    memos.forEach(memo => {
      const dateKey = getDateKey(memo.createdAt)
      if (!trash[dateKey]) {
        trash[dateKey] = []
      }
      trash[dateKey].push({
        ...memo,
        deletedAt: Date.now()
      })
    })
    saveTrash()  // 保存垃圾桶
    memos = []  // 清空备忘录
    saveMemos()  // 保存
    renderMemos()  // 重新渲染
  }
})
// 关闭按钮点击事件
document.getElementById('btnClose').addEventListener('click', () => {
  window.api.closeWindow()
})
// 垃圾桶按钮点击事件
document.getElementById('btnTrash').addEventListener('click', async () => {
  document.getElementById('settingsPanel').classList.remove('open')  // 关闭设置面板
  await loadTrash()  // 加载垃圾桶数据
  document.getElementById('trashSearchInput').value = ''  // 清空搜索框
  renderTrashPanel()  // 渲染垃圾桶
  document.getElementById('trashPanel').classList.add('open')  // 打开垃圾桶面板
})
// 垃圾桶返回按钮点击事件
document.getElementById('btnBackFromTrash').addEventListener('click', () => {
  document.getElementById('trashPanel').classList.remove('open')  // 关闭垃圾桶面板
})
// 垃圾桶搜索输入事件
document.getElementById('trashSearchInput').addEventListener('input', (e) => {
  renderTrashPanel(e.target.value)  // 根据搜索关键词渲染
})
// 清除搜索按钮点击事件
document.getElementById('btnClearTrashSearch').addEventListener('click', () => {
  document.getElementById('trashSearchInput').value = ''  // 清空搜索框
  renderTrashPanel()  // 重新渲染
})
// 日期详情返回按钮点击事件
document.getElementById('btnBackFromDate').addEventListener('click', () => {
  document.getElementById('trashDatePanel').classList.remove('open')  // 关闭日期详情面板
  selectedTrashItems.clear()  // 清空选中项
  renderTrashPanel()  // 刷新垃圾桶主面板
})
// 垃圾桶内容点击事件（选择项目）
document.getElementById('trashContent').addEventListener('click', (e) => {
  const checkbox = e.target.closest('.trash-item-checkbox')
  if (checkbox) {
    const id = checkbox.dataset.id
    if (selectedTrashItems.has(id)) {
      selectedTrashItems.delete(id)
      checkbox.classList.remove('checked')
    } else {
      selectedTrashItems.add(id)
      checkbox.classList.add('checked')
    }
    updateDeleteButton()
  }
})
// 日期详情内容点击事件（选择项目）
document.getElementById('trashDateContent').addEventListener('click', (e) => {
  const checkbox = e.target.closest('.trash-item-checkbox')
  if (checkbox) {
    const id = checkbox.dataset.id
    if (selectedTrashItems.has(id)) {
      selectedTrashItems.delete(id)
      checkbox.classList.remove('checked')
    } else {
      selectedTrashItems.add(id)
      checkbox.classList.add('checked')
    }
    updateDeleteButtonDate()
  }
})
// 垃圾桶主面板删除所选按钮点击事件
document.getElementById('btnDeleteSelected').addEventListener('click', () => {
  if (selectedTrashItems.size === 0) return
  
  if (confirm(`确定要永久删除选中的 ${selectedTrashItems.size} 条记录吗？`)) {
    Object.keys(trash).forEach(dateKey => {
      trash[dateKey] = trash[dateKey].filter(item => !selectedTrashItems.has(item.id))
    })
    Object.keys(trash).forEach(dateKey => {
      if (trash[dateKey].length === 0) {
        delete trash[dateKey]
      }
    })
    saveTrash()
    selectedTrashItems.clear()
    renderTrashPanel()
  }
})
// 日期详情面板删除所选按钮点击事件
document.getElementById('btnDeleteSelectedDate').addEventListener('click', () => {
  if (selectedTrashItems.size === 0) return
  
  const dateKey = document.getElementById('trashDateTitle').textContent
  
  if (confirm(`确定要永久删除选中的 ${selectedTrashItems.size} 条记录吗？`)) {
    trash[dateKey] = trash[dateKey].filter(item => !selectedTrashItems.has(item.id))
    if (trash[dateKey].length === 0) {
      delete trash[dateKey]
      document.getElementById('trashDatePanel').classList.remove('open')
      renderTrashPanel()
    } else {
      saveTrash()
      selectedTrashItems.clear()
      openDatePanel(dateKey)
    }
    saveTrash()
  }
})
// 全局键盘事件（ESC键退出）
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const trashDatePanel = document.getElementById('trashDatePanel')
    const trashPanel = document.getElementById('trashPanel')
    const settingsPanel = document.getElementById('settingsPanel')
    
    if (trashDatePanel.classList.contains('open')) {
      trashDatePanel.classList.remove('open')
      selectedTrashItems.clear()
      renderTrashPanel()
    } else if (trashPanel.classList.contains('open')) {
      trashPanel.classList.remove('open')
    } else if (settingsPanel.classList.contains('open')) {
      settingsPanel.classList.remove('open')
    }
  }
})
// ==================== 初始化 ====================
updateDate()  // 更新日期显示
setInterval(updateDate, 60000)  // 每分钟更新一次日期
loadMemos()  // 加载备忘录
loadConfig()  // 加载配置
// 如果没有备忘录，自动添加一个
if (memos.length === 0) {
  setTimeout(async () => {
    await loadMemos()
    if (memos.length === 0) {
      addMemo()
    }
  }, 500)
}

// ==================== 云同步功能 ====================
let syncState = {
  configured: false,
  loggedIn: false,
  user: null,
  authMode: 'login'
}

function showSyncMessage(message, type = 'info', persistent = false) {
  const msgEl = document.getElementById('syncMessage')
  msgEl.textContent = message
  msgEl.className = 'sync-message ' + type
  
  if (!persistent) {
    setTimeout(() => {
      msgEl.className = 'sync-message'
    }, 3000)
  }
}

function updateSyncUI() {
  const statusText = document.getElementById('syncStatusText')
  const statusEmail = document.getElementById('syncStatusEmail')
  const configForm = document.getElementById('syncConfigForm')
  const authForm = document.getElementById('syncAuthForm')
  const actions = document.getElementById('syncActions')
  
  if (!syncState.configured) {
    statusText.textContent = '未配置'
    statusEmail.textContent = ''
    configForm.style.display = 'block'
    authForm.style.display = 'none'
    actions.style.display = 'none'
  } else if (!syncState.loggedIn) {
    statusText.textContent = '未登录'
    statusEmail.textContent = ''
    configForm.style.display = 'none'
    authForm.style.display = 'block'
    actions.style.display = 'none'
  } else {
    statusText.textContent = '已登录'
    statusEmail.textContent = syncState.user?.email || ''
    configForm.style.display = 'none'
    authForm.style.display = 'none'
    actions.style.display = 'flex'
  }
}

async function initSync() {
  try {
    const result = await window.api.syncInit()
    syncState.configured = result.configured
    syncState.loggedIn = result.loggedIn
    syncState.user = result.user
    updateSyncUI()
  } catch (error) {
    console.error('Init sync error:', error)
  }
}

document.getElementById('btnSync').addEventListener('click', async () => {
  document.getElementById('settingsPanel').classList.remove('open')
  await initSync()
  document.getElementById('syncPanel').classList.add('open')
})

document.getElementById('btnBackFromSync').addEventListener('click', () => {
  document.getElementById('syncPanel').classList.remove('open')
})

document.getElementById('btnSaveSupabaseConfig').addEventListener('click', async () => {
  const url = document.getElementById('supabaseUrl').value.trim()
  const anonKey = document.getElementById('supabaseAnonKey').value.trim()
  
  if (!url || !anonKey) {
    showSyncMessage('请填写完整的配置信息', 'error')
    return
  }
  
  try {
    const result = await window.api.syncSetCredentials(url, anonKey)
    if (result.success) {
      syncState.configured = true
      showSyncMessage('配置保存成功', 'success')
      updateSyncUI()
    } else {
      showSyncMessage('配置保存失败', 'error')
    }
  } catch (error) {
    showSyncMessage('配置保存失败: ' + error.message, 'error')
  }
})

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    syncState.authMode = tab.dataset.tab
    document.getElementById('btnAuth').textContent = syncState.authMode === 'login' ? '登录' : '注册'
  })
})

document.getElementById('btnAuth').addEventListener('click', async () => {
  const email = document.getElementById('syncEmail').value.trim()
  const password = document.getElementById('syncPassword').value
  
  if (!email || !password) {
    showSyncMessage('请填写邮箱和密码', 'error')
    return
  }
  
  try {
    let result
    if (syncState.authMode === 'login') {
      result = await window.api.syncSignIn(email, password)
    } else {
      result = await window.api.syncSignUp(email, password)
    }
    
    if (result.success) {
      syncState.loggedIn = true
      syncState.user = result.user
      showSyncMessage(syncState.authMode === 'login' ? '登录成功' : '注册成功', 'success')
      updateSyncUI()
      document.getElementById('syncEmail').value = ''
      document.getElementById('syncPassword').value = ''
    } else {
      showSyncMessage(result.error, 'error')
    }
  } catch (error) {
    showSyncMessage('操作失败: ' + error.message, 'error')
  }
})

document.getElementById('btnUploadAll').addEventListener('click', async () => {
  const uploadBtn = document.getElementById('btnUploadAll')
  uploadBtn.disabled = true
  uploadBtn.style.opacity = '0.6'
  showSyncMessage('正在上传数据...', 'info', true)
  
  try {
    const memoCount = memos.length
    const trashCount = Object.values(trash).flat().length
    
    const result = await window.api.syncUploadAll()
    if (result.success) {
      showSyncMessage(`上传成功！备忘录 ${memoCount} 条，垃圾桶 ${trashCount} 条`, 'success')
    } else {
      showSyncMessage('上传失败: ' + result.error, 'error')
    }
  } catch (error) {
    showSyncMessage('上传失败: ' + error.message, 'error')
  } finally {
    uploadBtn.disabled = false
    uploadBtn.style.opacity = '1'
  }
})

document.getElementById('btnDownloadAll').addEventListener('click', async () => {
  if (!confirm('下载云端数据将覆盖本地数据，确定继续吗？')) {
    return
  }
  
  const downloadBtn = document.getElementById('btnDownloadAll')
  downloadBtn.disabled = true
  downloadBtn.style.opacity = '0.6'
  showSyncMessage('正在下载数据...', 'info', true)
  
  try {
    const result = await window.api.syncDownloadAll()
    if (result.success) {
      const data = result.data
      
      const memoCount = data.memos ? data.memos.length : 0
      const trashCount = data.trash ? Object.values(data.trash).flat().length : 0
      
      if (data.memos && data.memos.length > 0) {
        memos = data.memos
        await window.api.saveMemos(memos)
      }
      
      if (data.config) {
        config = { ...config, ...data.config }
        await window.api.saveConfig(config)
        await loadConfig()
      }
      
      if (data.trash) {
        trash = data.trash
        await window.api.saveTrash(trash)
      }
      
      renderMemos()
      showSyncMessage(`下载成功！备忘录 ${memoCount} 条，垃圾桶 ${trashCount} 条`, 'success')
    } else {
      showSyncMessage('下载失败: ' + result.error, 'error')
    }
  } catch (error) {
    showSyncMessage('下载失败: ' + error.message, 'error')
  } finally {
    downloadBtn.disabled = false
    downloadBtn.style.opacity = '1'
  }
})

document.getElementById('btnLogout').addEventListener('click', async () => {
  try {
    const result = await window.api.syncSignOut()
    if (result.success) {
      syncState.loggedIn = false
      syncState.user = null
      showSyncMessage('已退出登录', 'success')
      updateSyncUI()
    } else {
      showSyncMessage('退出失败: ' + result.error, 'error')
    }
  } catch (error) {
    showSyncMessage('退出失败: ' + error.message, 'error')
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const syncPanel = document.getElementById('syncPanel')
    if (syncPanel.classList.contains('open')) {
      syncPanel.classList.remove('open')
    }
  }
})
