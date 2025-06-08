import chalk from 'chalk';
import { Logger } from './logger';

/**
 * 进度条工具类
 */
export class ProgressBar {
  private current: number = 0;
  private total: number;
  private prefix: string;
  private barLength: number;
  private startTime: number;

  constructor(total: number, prefix: string, barLength: number = 40) {
    this.total = total;
    this.prefix = prefix;
    this.barLength = barLength;
    this.startTime = Date.now();
  }

  /**
   * 更新进度
   */
  update(current: number): void {
    this.current = Math.min(current, this.total);
    this.render();
  }

  /**
   * 完成进度条
   */
  complete(): void {
    this.current = this.total;
    this.render();
    console.log(); // 换行
  }

  /**
   * 渲染进度条
   */
  private render(): void {
    const percent = Math.floor((this.current * 100) / this.total);
    const filledLength = Math.floor((this.current * this.barLength) / this.total);
    
    // 构建进度条
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(this.barLength - filledLength);
    const bar = filled + empty;
    
    // 计算速度和ETA
    const elapsed = (Date.now() - this.startTime) / 1000;
    let speedInfo = '';
    
    if (elapsed > 0 && this.current > 0) {
      const speedMBps = (this.current / 1024 / 1024) / elapsed;
      
      if (percent > 0 && percent < 100) {
        const eta = (elapsed * (100 - percent)) / percent;
        speedInfo = ` ${speedMBps.toFixed(1)}MB/s ETA:${eta.toFixed(1)}s`;
      } else {
        speedInfo = ` ${speedMBps.toFixed(1)}MB/s`;
      }
    }
    
    const message = `${chalk.blue('[INFO]')} ${this.prefix} [${bar}] ${percent.toString().padStart(3)}%${speedInfo}`;
    Logger.sameLine(message);
  }

  /**
   * 重置进度条
   */
  reset(): void {
    this.current = 0;
    this.startTime = Date.now();
  }
}

/**
 * 简单的进度条显示函数
 */
export function showProgress(
  current: number,
  total: number,
  prefix: string,
  elapsedTime?: number,
  barLength: number = 40
): void {
  const percent = Math.floor((current * 100) / total);
  const filledLength = Math.floor((current * barLength) / total);
  
  // 构建进度条
  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(barLength - filledLength);
  const bar = filled + empty;
  
  // 计算速度信息
  let speedInfo = '';
  if (elapsedTime && elapsedTime > 0 && current > 0) {
    const speedMBps = (current / 1024 / 1024) / elapsedTime;
    
    if (percent > 0 && percent < 100) {
      const eta = (elapsedTime * (100 - percent)) / percent;
      speedInfo = ` ${speedMBps.toFixed(1)}MB/s ETA:${eta.toFixed(1)}s`;
    } else {
      speedInfo = ` ${speedMBps.toFixed(1)}MB/s`;
    }
  }
  
  const message = `${chalk.blue('[INFO]')} ${prefix} [${bar}] ${percent.toString().padStart(3)}%${speedInfo}`;
  Logger.sameLine(message);
}
