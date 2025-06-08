# Mac硬盘速度测试工具 - TypeScript版

一个用于测试Mac系统硬盘读写速度的TypeScript/Node.js工具，基于原Shell脚本重构而成。

## 功能特性

- 🔍 自动识别Mac下的硬盘挂载情况
- 📊 交互式硬盘和文件大小选择
- 🎯 可视化进度条显示测试进度
- 🔄 进行三次测速并计算平均值
- 📏 支持多种测试文件大小（1GB、5GB、10GB）
- 🧹 自动清理测速使用的临时文件
- 🎨 彩色输出，用户体验友好
- 📝 自动保存测试结果到日志文件
- ⚡ TypeScript类型安全
- 🛡️ 完整的错误处理和异常捕获

## 系统要求

- macOS系统
- Node.js >= 16.0.0
- 管理员权限（用于清除系统缓存）
- 足够的磁盘空间（至少是测试文件大小的2倍）

## 安装和使用

### 1. 安装依赖

```bash
npm install
```

### 2. 编译TypeScript

```bash
npm run build
```

### 3. 运行程序

```bash
# 生产模式
npm start

# 开发模式（直接运行TypeScript）
npm run dev

# 显示帮助信息
npm start -- --help
```

## 项目结构

```
src/
├── index.ts              # 主程序入口
├── types.ts              # TypeScript类型定义
├── core/
│   ├── testEngine.ts     # 测试引擎核心逻辑
│   └── logger.ts         # 日志管理器
├── utils/
│   ├── logger.ts         # 彩色日志工具
│   ├── progress.ts       # 进度条工具
│   └── system.ts         # 系统工具类
└── ui/
    └── interface.ts      # 用户界面交互
```

## 技术架构

### 核心组件

1. **TestEngine**: 硬盘速度测试引擎
   - 执行写入/读取测试
   - 进度监控和显示
   - 临时文件管理

2. **SystemUtils**: 系统工具类
   - 硬盘信息获取
   - 系统环境检查
   - 文件操作工具

3. **UserInterface**: 用户交互界面
   - 交互式选择菜单
   - 配置确认
   - 结果展示

4. **TestLogger**: 测试结果日志管理
   - 结果保存
   - 性能评估
   - 建议生成

### 类型安全

使用TypeScript提供完整的类型定义：

```typescript
interface DiskInfo {
  mountPoint: string;
  size: string;
  available: string;
  device: string;
  type: string;
  filesystem: string;
}

interface TestResult {
  round: number;
  writeSpeed: number; // MB/s
  readSpeed: number;  // MB/s
}
```

## 进度条设计

TypeScript版本的进度条具有以下特性：

- **实时速度显示**: 显示当前传输速度（MB/s）
- **预计剩余时间**: 智能计算ETA
- **可视化进度**: 使用Unicode字符创建进度条
- **平滑更新**: 每100ms更新一次

```typescript
class ProgressBar {
  update(current: number): void;
  complete(): void;
  reset(): void;
}
```

## 错误处理

完善的错误处理机制：

- **系统检查**: 验证macOS环境和必要命令
- **权限检查**: 确保有足够权限执行测试
- **空间检查**: 验证磁盘可用空间
- **异常捕获**: 全局异常处理和优雅退出
- **信号处理**: 支持Ctrl+C中断

## 日志功能

自动生成详细的测试日志：

```
logs/disk_test_[硬盘名称]_[文件大小]_[时间戳].log
```

日志内容包括：
- 系统信息（Node.js版本、内存等）
- 硬盘详细信息
- 三轮测试的详细结果
- 平均速度统计
- 性能评估和建议

## 性能优化

- **异步操作**: 使用Promise和async/await
- **进程管理**: 合理的子进程管理
- **内存优化**: 及时清理临时文件
- **类型优化**: TypeScript编译时优化

## 开发脚本

```bash
# 编译TypeScript
npm run build

# 开发模式运行
npm run dev

# 生产模式运行
npm start

# 清理编译文件
npm run clean

# 测试运行
npm test
```

## 与Shell版本的对比

| 特性 | Shell版本 | TypeScript版本 |
|------|-----------|----------------|
| 类型安全 | ❌ | ✅ |
| 错误处理 | 基础 | 完善 |
| 代码维护性 | 中等 | 优秀 |
| 扩展性 | 有限 | 良好 |
| 依赖管理 | 系统命令 | npm生态 |
| 跨平台 | macOS only | 可扩展 |
| 测试支持 | 有限 | 完善 |

## 故障排除

### 常见问题

1. **权限错误**
   ```bash
   sudo npm start
   ```

2. **Node.js版本过低**
   ```bash
   node --version  # 确保 >= 16.0.0
   ```

3. **依赖安装失败**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **编译错误**
   ```bash
   npm run clean
   npm run build
   ```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个工具！

## 技术栈

- **TypeScript**: 类型安全的JavaScript
- **Node.js**: JavaScript运行时
- **Inquirer**: 交互式命令行界面
- **Chalk**: 终端颜色输出
- **Child Process**: 系统命令执行
