import inquirer from "inquirer";
import { DiskInfo, FileSizeOption, FILE_SIZE_MAP, TestConfig } from "../types";
import { SystemUtils } from "../utils/system";
import { Logger } from "../utils/logger";

/**
 * 用户界面类
 */
export class UserInterface {
  /**
   * 显示欢迎信息
   */
  static showWelcome(): void {
    Logger.title("Mac硬盘速度测试工具 - TypeScript版");
  }

  /**
   * 显示挂载的硬盘信息
   */
  static displayMountedDisks(disks: DiskInfo[]): void {
    Logger.info("当前挂载的硬盘:");
    console.log();

    disks.forEach((disk, index) => {
      console.log(
        `${(index + 1).toString().padStart(2)}) ` +
          `${disk.mountPoint.padEnd(25)} ` +
          `[${disk.size.padStart(8)}] ` +
          `可用: ${disk.available.padStart(8)} ` +
          `设备: ${disk.device.padEnd(15)} ` +
          `${disk.type}`
      );
    });
    console.log();
  }

  /**
   * 选择硬盘
   */
  static async selectDisk(disks: DiskInfo[]): Promise<DiskInfo> {
    const choices = disks.map((disk, index) => ({
      name: `${disk.mountPoint} [${disk.size}] 可用: ${disk.available} (${disk.type})`,
      value: disk,
      short: disk.mountPoint,
    }));

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "selectedDisk",
        message: "请选择要测试的硬盘:",
        choices,
        pageSize: 10,
      },
    ]);

    Logger.success(`已选择硬盘: ${answer.selectedDisk.mountPoint}`);
    return answer.selectedDisk;
  }

  /**
   * 选择文件大小
   */
  static async selectFileSize(): Promise<FileSizeOption> {
    const choices = Object.entries(FILE_SIZE_MAP).map(([key, value]) => ({
      name: value.label,
      value: key as FileSizeOption,
      short: key,
    }));

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "fileSize",
        message: "请选择测试文件大小:",
        choices,
      },
    ]);

    const fileSize = answer.fileSize as FileSizeOption;
    const selectedOption = FILE_SIZE_MAP[fileSize];
    Logger.success(`已选择: ${selectedOption.label}`);
    return fileSize;
  }

  /**
   * 确认测试配置
   */
  static async confirmTestConfig(config: TestConfig): Promise<boolean> {
    console.log();
    Logger.info("测试配置确认:");
    console.log(`  硬盘路径: ${config.diskPath}`);
    console.log(
      `  文件大小: ${config.fileSize} (${(
        config.fileSizeBytes /
        1024 /
        1024 /
        1024
      ).toFixed(1)}GB)`
    );
    console.log();

    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: "确认开始测试?",
        default: true,
      },
    ]);

    return answer.confirmed;
  }

  /**
   * 显示系统检查结果
   */
  static showSystemCheck(): boolean {
    Logger.info("正在检查系统环境...");

    // 检查操作系统
    if (!SystemUtils.isMacOS()) {
      Logger.error("此工具仅支持macOS系统");
      return false;
    }

    // 检查必要命令
    const missingCommands = SystemUtils.checkRequiredCommands();
    if (missingCommands.length > 0) {
      Logger.error(`缺少必要的命令: ${missingCommands.join(", ")}`);
      return false;
    }

    Logger.success("系统环境检查通过");
    return true;
  }

  /**
   * 显示错误信息
   */
  static showError(error: Error): void {
    Logger.error(error.message);
    console.log();
  }

  /**
   * 显示帮助信息
   */
  static showHelp(): void {
    console.log("Mac硬盘速度测试工具 - TypeScript版");
    console.log();
    console.log("用法:");
    console.log("  npm start              # 交互式运行");
    console.log("  npm run dev            # 开发模式运行");
    console.log("  npm run build          # 编译TypeScript");
    console.log();
    console.log("功能特性:");
    console.log("  ✅ 自动识别Mac下的硬盘挂载情况");
    console.log("  ✅ 交互式硬盘和文件大小选择");
    console.log("  ✅ 可视化进度条显示");
    console.log("  ✅ 三轮测试并计算平均值");
    console.log("  ✅ 自动清理临时文件");
    console.log("  ✅ 详细的测试结果和日志");
    console.log();
    console.log("支持的文件大小:");
    Object.entries(FILE_SIZE_MAP).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.label}`);
    });
    console.log();
  }

  /**
   * 询问是否查看详细结果
   */
  static async askViewDetails(): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "viewDetails",
        message: "是否查看详细的测试结果?",
        default: true,
      },
    ]);

    return answer.viewDetails;
  }

  /**
   * 询问是否保存结果到文件
   */
  static async askSaveResults(): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "saveResults",
        message: "是否保存测试结果到日志文件?",
        default: true,
      },
    ]);

    return answer.saveResults;
  }

  /**
   * 询问是否继续测试
   */
  static async askContinue(): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "continue",
        message: "是否进行另一次测试?",
        default: false,
      },
    ]);

    return answer.continue;
  }
}
