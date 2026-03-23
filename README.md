# 桌面备忘录

一个简洁高效的 Windows 桌面备忘录应用，支持云端同步。

## 功能特点

- **备忘录管理** - 添加、编辑、删除、标记完成、优先级排序
- **垃圾桶** - 按日期分类显示，支持批量永久删除
- **云同步** - 支持 Supabase 云端同步，数据多端备份
- **窗口置顶** - 窗口始终显示在最上层
- **透明背景** - 可调节背景透明度（30%-100%）
- **全局快捷键** - Ctrl+Shift+M 快速显示/隐藏
- **系统托盘** - 最小化到托盘，支持开机自启动
- **单实例** - 防止重复启动

## 快速开始

### 运行项目

```bash
# 安装依赖
npm install

# 启动应用
npm start
```

### 构建安装包

```bash
# 构建 Windows 安装包
npm run build
```

构建完成后，安装包位于 `dist/` 目录。

## 技术栈

- Electron 28
- Supabase (云同步)
- electron-store (本地加密存储)

## 项目结构

```
desktop-memo/
├── main.js          # 主进程
├── preload.js       # 预加载脚本
├── renderer.js      # 渲染进程逻辑
├── index.html       # 主页面
├── styles.css       # 样式文件
├── sync-service.js  # 云同步服务
└── package.json     # 项目配置
```

## 更新日志

详细版本更新历史请查看 [CHANGELOG.md](./CHANGELOG.md)

## 许可证

MIT
