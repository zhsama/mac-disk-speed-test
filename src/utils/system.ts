import { execSync, spawn } from "child_process";
import { statSync, existsSync } from "fs";
import { DiskInfo, SystemInfo } from "../types";

/**
 * 系统工具类
 */
export class SystemUtils {
  /**
   * 检查是否为macOS系统
   */
  static isMacOS(): boolean {
    return process.platform === "darwin";
  }

  /**
   * 获取系统信息
   */
  static getSystemInfo(): SystemInfo {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      totalMemory: require("os").totalmem(),
      freeMemory: require("os").freemem(),
    };
  }

  /**
   * 获取挂载的硬盘信息
   */
  static getMountedDisks(): DiskInfo[] {
    if (!this.isMacOS()) {
      throw new Error("此工具仅支持macOS系统");
    }

    try {
      // 使用df命令获取挂载信息
      const dfOutput = execSync("df -h", { encoding: "utf8" });
      const lines = dfOutput.split("\n").slice(1); // 跳过标题行

      const disks: DiskInfo[] = [];

      for (const line of lines) {
        if (!line.trim() || !line.startsWith("/dev/")) continue;

        const parts = line.trim().split(/\s+/);
        if (parts.length < 9) continue;

        const device = parts[0];
        const size = parts[1];
        const available = parts[3];
        const mountPoint = parts.slice(8).join(" "); // 处理包含空格的挂载点

        // 确保必要字段不为undefined
        if (!device || !size || !available || !mountPoint) continue;

        // 跳过系统卷
        if (this.isSystemVolume(mountPoint)) continue;

        // 获取硬盘类型信息
        const diskType = this.getDiskType(device);

        disks.push({
          mountPoint,
          size,
          available,
          device,
          type: diskType.type,
          filesystem: diskType.filesystem,
        });
      }

      return disks;
    } catch (error) {
      throw new Error(`获取硬盘信息失败: ${error}`);
    }
  }

  /**
   * 判断是否为系统卷
   */
  private static isSystemVolume(mountPoint: string): boolean {
    const systemVolumes = [
      "/System/Volumes/VM",
      "/System/Volumes/Preboot",
      "/System/Volumes/Update",
      "/System/Volumes/xarts",
      "/System/Volumes/iSCPreboot",
      "/System/Volumes/Hardware",
    ];
    return systemVolumes.includes(mountPoint);
  }

  /**
   * 获取硬盘类型信息
   */
  private static getDiskType(device: string): {
    type: string;
    filesystem: string;
  } {
    try {
      const diskutilOutput = execSync(`diskutil info "${device}"`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"], // 忽略stderr
      });

      let type = "Unknown";
      let filesystem = "Unknown";

      const lines = diskutilOutput.split("\n");
      for (const line of lines) {
        if (line.includes("Protocol:")) {
          type = line.split(":")[1]?.trim() || "Unknown";
        }
        if (line.includes("File System Personality:")) {
          filesystem = line.split(":")[1]?.trim() || "Unknown";
        }
        if (line.includes("Media Name:")) {
          const mediaName = line.split(":")[1]?.trim();
          if (mediaName && !type.includes(mediaName)) {
            type = `${mediaName} ${type}`.trim();
          }
        }
      }

      return { type, filesystem };
    } catch {
      return { type: "Unknown", filesystem: "Unknown" };
    }
  }

  /**
   * 检查磁盘空间
   */
  static checkDiskSpace(diskPath: string, requiredBytes: number): boolean {
    try {
      const dfOutput = execSync(`df "${diskPath}"`, { encoding: "utf8" });
      const lines = dfOutput.split("\n");
      if (lines.length < 2) return false;

      const secondLine = lines[1];
      if (!secondLine) return false;

      const parts = secondLine.trim().split(/\s+/);
      if (parts.length < 4) return false;

      const availableKBStr = parts[3];
      if (!availableKBStr) return false;

      const availableKB = parseInt(availableKBStr, 10);
      if (isNaN(availableKB)) return false;

      const availableBytes = availableKB * 1024;

      return availableBytes >= requiredBytes * 2; // 需要2倍空间
    } catch {
      return false;
    }
  }

  /**
   * 获取文件大小
   */
  static getFileSize(filePath: string): number {
    try {
      if (!existsSync(filePath)) return 0;
      return statSync(filePath).size;
    } catch {
      return 0;
    }
  }

  /**
   * 清除系统缓存
   */
  static async purgeCache(): Promise<void> {
    try {
      execSync("sudo purge", { stdio: "ignore" });
    } catch {
      // 忽略错误，继续执行
    }
  }

  /**
   * 检查必要的命令是否存在
   */
  static checkRequiredCommands(): string[] {
    const commands = ["df", "diskutil", "dd"];
    const missing: string[] = [];

    for (const cmd of commands) {
      try {
        execSync(`which ${cmd}`, { stdio: "ignore" });
      } catch {
        missing.push(cmd);
      }
    }

    return missing;
  }

  /**
   * 验证路径是否存在且可访问
   */
  static validatePath(path: string): boolean {
    try {
      return existsSync(path) && statSync(path).isDirectory();
    } catch {
      return false;
    }
  }
}
