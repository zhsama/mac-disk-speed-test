import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { CompleteTestResult } from "../types";
import { SystemUtils } from "../utils/system";
import { Logger } from "../utils/logger";

/**
 * 测试结果日志管理器
 */
export class TestLogger {
  private static readonly LOGS_DIR = "logs";

  /**
   * 保存测试结果到日志文件
   */
  static saveTestResults(result: CompleteTestResult): string {
    // 确保logs目录存在
    this.ensureLogsDirectory();

    // 生成日志文件名
    const fileName = this.generateLogFileName(result);
    const filePath = join(this.LOGS_DIR, fileName);

    // 生成日志内容
    const logContent = this.generateLogContent(result);

    try {
      writeFileSync(filePath, logContent, "utf8");
      Logger.success(`测试结果已保存到: ${filePath}`);
      return filePath;
    } catch (error) {
      Logger.error(`保存日志文件失败: ${error}`);
      throw error;
    }
  }

  /**
   * 确保logs目录存在
   */
  private static ensureLogsDirectory(): void {
    if (!existsSync(this.LOGS_DIR)) {
      mkdirSync(this.LOGS_DIR, { recursive: true });
    }
  }

  /**
   * 生成日志文件名
   */
  private static generateLogFileName(result: CompleteTestResult): string {
    const timestamp = result.timestamp
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .split(".")[0]; // 移除毫秒部分

    const diskName = result.testConfig.diskPath
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    return `disk_test_${diskName}_${result.testConfig.fileSize}_${timestamp}.log`;
  }

  /**
   * 生成日志内容
   */
  private static generateLogContent(result: CompleteTestResult): string {
    const systemInfo = SystemUtils.getSystemInfo();

    const content = [
      "========================================",
      "Mac硬盘速度测试结果 - TypeScript版",
      "========================================",
      `测试时间: ${result.timestamp.toLocaleString("zh-CN")}`,
      `测试路径: ${result.testConfig.diskPath}`,
      `文件大小: ${result.testConfig.fileSize}`,
      "",
      "系统信息:",
      `  操作系统: ${systemInfo.platform} (${systemInfo.arch})`,
      `  Node.js版本: ${systemInfo.nodeVersion}`,
      `  总内存: ${(systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB`,
      `  可用内存: ${(systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(
        2
      )}GB`,
      "",
      "硬盘信息:",
      `  挂载点: ${result.diskInfo.mountPoint}`,
      `  总容量: ${result.diskInfo.size}`,
      `  可用空间: ${result.diskInfo.available}`,
      `  设备: ${result.diskInfo.device}`,
      `  类型: ${result.diskInfo.type}`,
      `  文件系统: ${result.diskInfo.filesystem}`,
      "",
      "详细测试结果:",
      ...result.results.map(
        (r) =>
          `第${r.round}轮 - 写入: ${r.writeSpeed.toFixed(
            2
          )} MB/s  读取: ${r.readSpeed.toFixed(2)} MB/s`
      ),
      "",
      "平均速度:",
      `  写入: ${result.averageWriteSpeed.toFixed(2)} MB/s`,
      `  读取: ${result.averageReadSpeed.toFixed(2)} MB/s`,
      "",
      "性能评估:",
      this.generatePerformanceAssessment(result),
      "",
      "========================================",
      `日志生成时间: ${new Date().toLocaleString("zh-CN")}`,
      "由 Mac硬盘速度测试工具 (TypeScript版) 生成",
      "========================================",
    ];

    return content.join("\n");
  }

  /**
   * 生成性能评估
   */
  private static generatePerformanceAssessment(
    result: CompleteTestResult
  ): string {
    const writeSpeed = result.averageWriteSpeed;
    const readSpeed = result.averageReadSpeed;

    let writeAssessment = "";
    let readAssessment = "";

    // 写入速度评估
    if (writeSpeed >= 1000) {
      writeAssessment = "优秀 (>1000 MB/s)";
    } else if (writeSpeed >= 500) {
      writeAssessment = "良好 (500-1000 MB/s)";
    } else if (writeSpeed >= 100) {
      writeAssessment = "一般 (100-500 MB/s)";
    } else {
      writeAssessment = "较慢 (<100 MB/s)";
    }

    // 读取速度评估
    if (readSpeed >= 1000) {
      readAssessment = "优秀 (>1000 MB/s)";
    } else if (readSpeed >= 500) {
      readAssessment = "良好 (500-1000 MB/s)";
    } else if (readSpeed >= 100) {
      readAssessment = "一般 (100-500 MB/s)";
    } else {
      readAssessment = "较慢 (<100 MB/s)";
    }

    return [
      `  写入性能: ${writeAssessment}`,
      `  读取性能: ${readAssessment}`,
      "",
      "建议:",
      this.generateRecommendations(writeSpeed, readSpeed),
    ].join("\n");
  }

  /**
   * 生成性能建议
   */
  private static generateRecommendations(
    writeSpeed: number,
    readSpeed: number
  ): string {
    const recommendations: string[] = [];

    if (writeSpeed < 100 || readSpeed < 100) {
      recommendations.push("  - 考虑升级到SSD硬盘以获得更好的性能");
    }

    if (writeSpeed < 500 && readSpeed < 500) {
      recommendations.push("  - 检查硬盘是否有足够的可用空间");
      recommendations.push("  - 考虑进行磁盘碎片整理");
    }

    if (Math.abs(writeSpeed - readSpeed) > writeSpeed * 0.5) {
      recommendations.push("  - 写入和读取速度差异较大，可能存在硬盘问题");
    }

    if (recommendations.length === 0) {
      recommendations.push("  - 硬盘性能表现良好，无需特别优化");
    }

    return recommendations.join("\n");
  }

  /**
   * 显示测试结果摘要
   */
  static displayResultSummary(result: CompleteTestResult): void {
    console.log();
    Logger.separator();
    Logger.success("测试完成！");
    Logger.separator();
    console.log();

    console.log(`测试硬盘       : ${result.testConfig.diskPath}`);
    console.log(`测试文件大小   : ${result.testConfig.fileSize}`);
    console.log();

    console.log("详细结果:");
    result.results.forEach((r) => {
      console.log(
        `第${r.round}轮 - 写入: ${r.writeSpeed
          .toFixed(2)
          .padStart(8)} MB/s  读取: ${r.readSpeed.toFixed(2).padStart(8)} MB/s`
      );
    });

    console.log();
    console.log(
      `平均速度 - 写入: ${result.averageWriteSpeed
        .toFixed(2)
        .padStart(8)} MB/s  读取: ${result.averageReadSpeed
        .toFixed(2)
        .padStart(8)} MB/s`
    );
    Logger.separator();
  }
}
