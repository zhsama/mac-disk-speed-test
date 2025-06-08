import { spawn, ChildProcess } from 'child_process';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { TestConfig, TestResult, TestPhase, ProgressCallback } from '../types';
import { SystemUtils } from '../utils/system';
import { Logger } from '../utils/logger';
import { showProgress } from '../utils/progress';

/**
 * 硬盘速度测试引擎
 */
export class TestEngine {
  private testConfig: TestConfig;
  private testFile: string;

  constructor(testConfig: TestConfig) {
    this.testConfig = testConfig;
    this.testFile = join(testConfig.diskPath, `disk_speed_test_${Date.now()}.tmp`);
  }

  /**
   * 执行完整的速度测试（3轮）
   */
  async runCompleteTest(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    Logger.info('开始硬盘速度测试');
    Logger.info(`测试路径: ${this.testConfig.diskPath}`);
    Logger.info(`文件大小: ${this.testConfig.fileSize} (${(this.testConfig.fileSizeBytes / 1024 / 1024 / 1024).toFixed(1)}GB)`);
    console.log();

    // 检查磁盘空间
    if (!SystemUtils.checkDiskSpace(this.testConfig.diskPath, this.testConfig.fileSizeBytes)) {
      throw new Error(`磁盘空间不足！需要至少 ${(this.testConfig.fileSizeBytes * 2 / 1024 / 1024 / 1024).toFixed(1)}GB 可用空间`);
    }

    Logger.info('开始进行3轮测试...');
    console.log();

    for (let round = 1; round <= 3; round++) {
      Logger.info(`=== 第 ${round} 轮测试 ===`);

      // 写入测试
      const writeSpeed = await this.testWriteSpeed();
      Logger.success(`写入速度: ${writeSpeed.toFixed(2)} MB/s`);

      // 读取测试
      const readSpeed = await this.testReadSpeed();
      Logger.success(`读取速度: ${readSpeed.toFixed(2)} MB/s`);

      results.push({
        round,
        writeSpeed,
        readSpeed
      });

      // 清理测试文件
      this.cleanup();

      // 等待1秒再进行下一轮测试
      if (round < 3) {
        await this.sleep(1000);
      }

      console.log();
    }

    return results;
  }

  /**
   * 执行写入速度测试
   */
  private async testWriteSpeed(): Promise<number> {
    Logger.info('开始写入速度测试...');

    // 清除系统缓存
    await SystemUtils.purgeCache();

    const startTime = Date.now();
    const blockSize = '1m';
    const count = Math.floor(this.testConfig.fileSizeBytes / (1024 * 1024));

    return new Promise((resolve, reject) => {
      const ddProcess = spawn('dd', [
        'if=/dev/zero',
        `of=${this.testFile}`,
        `bs=${blockSize}`,
        `count=${count}`,
        'conv=fsync'
      ], {
        stdio: ['ignore', 'ignore', 'ignore']
      });

      // 显示进度条
      this.showWriteProgress(ddProcess, startTime);

      ddProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        if (code === 0) {
          const speedMBps = (this.testConfig.fileSizeBytes / 1024 / 1024) / duration;
          
          // 确保进度条显示100%
          showProgress(this.testConfig.fileSizeBytes, this.testConfig.fileSizeBytes, '写入数据', duration);
          console.log();
          
          resolve(speedMBps);
        } else {
          reject(new Error(`写入测试失败，退出码: ${code}`));
        }
      });

      ddProcess.on('error', (error) => {
        reject(new Error(`写入测试失败: ${error.message}`));
      });
    });
  }

  /**
   * 执行读取速度测试
   */
  private async testReadSpeed(): Promise<number> {
    Logger.info('开始读取速度测试...');

    // 清除系统缓存
    await SystemUtils.purgeCache();

    const startTime = Date.now();
    const blockSize = '1m';

    return new Promise((resolve, reject) => {
      const ddProcess = spawn('dd', [
        `if=${this.testFile}`,
        'of=/dev/null',
        `bs=${blockSize}`
      ], {
        stdio: ['ignore', 'ignore', 'ignore']
      });

      // 显示进度条
      this.showReadProgress(ddProcess, startTime);

      ddProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        if (code === 0) {
          const speedMBps = (this.testConfig.fileSizeBytes / 1024 / 1024) / duration;
          
          // 确保进度条显示100%
          showProgress(this.testConfig.fileSizeBytes, this.testConfig.fileSizeBytes, '读取数据', duration);
          console.log();
          
          resolve(speedMBps);
        } else {
          reject(new Error(`读取测试失败，退出码: ${code}`));
        }
      });

      ddProcess.on('error', (error) => {
        reject(new Error(`读取测试失败: ${error.message}`));
      });
    });
  }

  /**
   * 显示写入进度条
   */
  private showWriteProgress(ddProcess: ChildProcess, startTime: number): void {
    const interval = setInterval(() => {
      if (ddProcess.killed) {
        clearInterval(interval);
        return;
      }

      const currentSize = SystemUtils.getFileSize(this.testFile);
      const elapsed = (Date.now() - startTime) / 1000;
      
      showProgress(
        Math.min(currentSize, this.testConfig.fileSizeBytes),
        this.testConfig.fileSizeBytes,
        '写入数据',
        elapsed
      );
    }, 100);

    ddProcess.on('close', () => {
      clearInterval(interval);
    });
  }

  /**
   * 显示读取进度条（模拟进度）
   */
  private showReadProgress(ddProcess: ChildProcess, startTime: number): void {
    const totalSteps = 50;
    const stepSize = this.testConfig.fileSizeBytes / totalSteps;
    let currentStep = 0;

    const interval = setInterval(() => {
      if (ddProcess.killed) {
        clearInterval(interval);
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const currentSize = Math.min(currentStep * stepSize, this.testConfig.fileSizeBytes);
      
      showProgress(currentSize, this.testConfig.fileSizeBytes, '读取数据', elapsed);
      
      currentStep++;
      if (currentStep > totalSteps) {
        currentStep = totalSteps;
      }
    }, 100);

    ddProcess.on('close', () => {
      clearInterval(interval);
    });
  }

  /**
   * 清理测试文件
   */
  private cleanup(): void {
    try {
      unlinkSync(this.testFile);
    } catch {
      // 忽略清理错误
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 强制清理（用于异常情况）
   */
  forceCleanup(): void {
    this.cleanup();
  }
}
