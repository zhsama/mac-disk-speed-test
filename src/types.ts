/**
 * 硬盘信息接口
 */
export interface DiskInfo {
  mountPoint: string;
  size: string;
  available: string;
  device: string;
  type: string;
  filesystem: string;
}

/**
 * 测试配置接口
 */
export interface TestConfig {
  diskPath: string;
  fileSize: FileSizeOption;
  fileSizeBytes: number;
}

/**
 * 文件大小选项
 */
export type FileSizeOption = '1g' | '5g' | '10g';

/**
 * 文件大小映射
 */
export const FILE_SIZE_MAP: Record<FileSizeOption, { bytes: number; label: string }> = {
  '1g': { bytes: 1024 * 1024 * 1024, label: '1GB - 快速测试' },
  '5g': { bytes: 5 * 1024 * 1024 * 1024, label: '5GB - 标准测试' },
  '10g': { bytes: 10 * 1024 * 1024 * 1024, label: '10GB - 深度测试' }
};

/**
 * 测试结果接口
 */
export interface TestResult {
  round: number;
  writeSpeed: number; // MB/s
  readSpeed: number;  // MB/s
}

/**
 * 完整测试结果接口
 */
export interface CompleteTestResult {
  diskInfo: DiskInfo;
  testConfig: TestConfig;
  results: TestResult[];
  averageWriteSpeed: number;
  averageReadSpeed: number;
  timestamp: Date;
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (current: number, total: number, speed?: number) => void;

/**
 * 日志级别
 */
export enum LogLevel {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * 测试阶段
 */
export enum TestPhase {
  WRITE = 'write',
  READ = 'read'
}

/**
 * 系统信息接口
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  totalMemory: number;
  freeMemory: number;
}
