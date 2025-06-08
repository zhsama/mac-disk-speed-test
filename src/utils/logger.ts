import chalk from 'chalk';
import { LogLevel } from '../types';

/**
 * 彩色日志工具类
 */
export class Logger {
  /**
   * 打印信息日志
   */
  static info(message: string): void {
    console.log(chalk.blue('[INFO]'), message);
  }

  /**
   * 打印成功日志
   */
  static success(message: string): void {
    console.log(chalk.green('[SUCCESS]'), message);
  }

  /**
   * 打印警告日志
   */
  static warning(message: string): void {
    console.log(chalk.yellow('[WARNING]'), message);
  }

  /**
   * 打印错误日志
   */
  static error(message: string): void {
    console.log(chalk.red('[ERROR]'), message);
  }

  /**
   * 根据级别打印日志
   */
  static log(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.INFO:
        this.info(message);
        break;
      case LogLevel.SUCCESS:
        this.success(message);
        break;
      case LogLevel.WARNING:
        this.warning(message);
        break;
      case LogLevel.ERROR:
        this.error(message);
        break;
    }
  }

  /**
   * 打印分隔线
   */
  static separator(char: string = '=', length: number = 40): void {
    console.log(char.repeat(length));
  }

  /**
   * 打印标题
   */
  static title(title: string): void {
    this.separator();
    console.log(chalk.bold.cyan(`        ${title}`));
    this.separator();
    console.log();
  }

  /**
   * 清除当前行（用于进度条）
   */
  static clearLine(): void {
    process.stdout.write('\r\x1b[K');
  }

  /**
   * 在同一行输出（用于进度条）
   */
  static sameLine(message: string): void {
    process.stdout.write(`\r${message}`);
  }
}
