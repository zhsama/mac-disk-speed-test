#!/usr/bin/env node

import { DiskInfo, TestConfig, CompleteTestResult, FILE_SIZE_MAP } from './types';
import { SystemUtils } from './utils/system';
import { Logger } from './utils/logger';
import { UserInterface } from './ui/interface';
import { TestEngine } from './core/testEngine';
import { TestLogger } from './core/logger';

/**
 * Mac硬盘速度测试工具主类
 */
class MacDiskSpeedTest {
  /**
   * 主程序入口
   */
  async run(): Promise<void> {
    try {
      // 显示欢迎信息
      UserInterface.showWelcome();

      // 检查命令行参数
      if (this.shouldShowHelp()) {
        UserInterface.showHelp();
        return;
      }

      // 系统环境检查
      if (!UserInterface.showSystemCheck()) {
        process.exit(1);
      }

      // 主循环 - 支持多次测试
      let continueTest = true;
      while (continueTest) {
        await this.runSingleTest();
        continueTest = await UserInterface.askContinue();
        if (continueTest) {
          console.log();
        }
      }

      Logger.info('感谢使用Mac硬盘速度测试工具！');
    } catch (error) {
      if (error instanceof Error) {
        UserInterface.showError(error);
      } else {
        Logger.error('发生未知错误');
      }
      process.exit(1);
    }
  }

  /**
   * 执行单次测试
   */
  private async runSingleTest(): Promise<void> {
    // 获取挂载的硬盘
    const disks = await this.getMountedDisks();
    
    // 显示硬盘信息
    UserInterface.displayMountedDisks(disks);

    // 用户选择硬盘
    const selectedDisk = await UserInterface.selectDisk(disks);
    console.log();

    // 用户选择文件大小
    const fileSize = await UserInterface.selectFileSize();
    
    // 创建测试配置
    const testConfig: TestConfig = {
      diskPath: selectedDisk.mountPoint,
      fileSize,
      fileSizeBytes: FILE_SIZE_MAP[fileSize].bytes
    };

    // 确认测试配置
    const confirmed = await UserInterface.confirmTestConfig(testConfig);
    if (!confirmed) {
      Logger.info('测试已取消');
      return;
    }

    // 验证磁盘路径
    if (!SystemUtils.validatePath(testConfig.diskPath)) {
      throw new Error(`硬盘路径不存在或无法访问: ${testConfig.diskPath}`);
    }

    // 执行测试
    const testEngine = new TestEngine(testConfig);
    let testResults;
    
    try {
      testResults = await testEngine.runCompleteTest();
    } catch (error) {
      testEngine.forceCleanup();
      throw error;
    }

    // 计算平均值
    const averageWriteSpeed = testResults.reduce((sum, r) => sum + r.writeSpeed, 0) / testResults.length;
    const averageReadSpeed = testResults.reduce((sum, r) => sum + r.readSpeed, 0) / testResults.length;

    // 创建完整测试结果
    const completeResult: CompleteTestResult = {
      diskInfo: selectedDisk,
      testConfig,
      results: testResults,
      averageWriteSpeed,
      averageReadSpeed,
      timestamp: new Date()
    };

    // 显示测试结果
    TestLogger.displayResultSummary(completeResult);

    // 询问是否保存结果
    const shouldSave = await UserInterface.askSaveResults();
    if (shouldSave) {
      TestLogger.saveTestResults(completeResult);
    }
  }

  /**
   * 获取挂载的硬盘信息
   */
  private async getMountedDisks(): Promise<DiskInfo[]> {
    Logger.info('正在扫描挂载的硬盘...');
    
    try {
      const disks = SystemUtils.getMountedDisks();
      
      if (disks.length === 0) {
        throw new Error('未找到可用的硬盘');
      }

      return disks;
    } catch (error) {
      throw new Error(`获取硬盘信息失败: ${error}`);
    }
  }

  /**
   * 检查是否应该显示帮助信息
   */
  private shouldShowHelp(): boolean {
    const args = process.argv.slice(2);
    return args.includes('-h') || args.includes('--help');
  }
}

/**
 * 全局错误处理
 */
process.on('uncaughtException', (error) => {
  Logger.error(`未捕获的异常: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Logger.error(`未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

/**
 * 信号处理 - 优雅退出
 */
process.on('SIGINT', () => {
  console.log();
  Logger.warning('测试被用户中断');
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.warning('收到终止信号，正在退出...');
  process.exit(0);
});

/**
 * 程序入口点
 */
async function main(): Promise<void> {
  const app = new MacDiskSpeedTest();
  await app.run();
}

// 运行主程序
if (require.main === module) {
  main().catch((error) => {
    Logger.error(`程序执行失败: ${error.message}`);
    process.exit(1);
  });
}
