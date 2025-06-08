#!/bin/bash

# Mac硬盘速度测试工具 - TypeScript版本安装脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查系统要求
check_requirements() {
    print_info "检查系统要求..."
    
    # 检查macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "此工具仅支持macOS系统"
        exit 1
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "未找到Node.js，请先安装Node.js (>= 16.0.0)"
        print_info "访问 https://nodejs.org/ 下载安装"
        exit 1
    fi
    
    # 检查Node.js版本
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    if ! node -e "process.exit(process.version.slice(1).split('.').map(Number).reduce((a,b,i)=>a+b*Math.pow(1000,2-i),0) >= '$REQUIRED_VERSION'.split('.').map(Number).reduce((a,b,i)=>a+b*Math.pow(1000,2-i),0) ? 0 : 1)"; then
        print_error "Node.js版本过低，当前版本: $NODE_VERSION，要求版本: >= $REQUIRED_VERSION"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "未找到npm，请确保Node.js安装正确"
        exit 1
    fi
    
    print_success "系统要求检查通过"
}

# 安装依赖
install_dependencies() {
    print_info "安装项目依赖..."
    
    if npm install; then
        print_success "依赖安装完成"
    else
        print_error "依赖安装失败"
        exit 1
    fi
}

# 编译TypeScript
build_project() {
    print_info "编译TypeScript代码..."
    
    if npm run build; then
        print_success "编译完成"
    else
        print_error "编译失败"
        exit 1
    fi
}

# 运行测试
run_test() {
    print_info "运行快速测试..."
    
    if npm start -- --help > /dev/null 2>&1; then
        print_success "程序运行正常"
    else
        print_warning "程序测试失败，但安装可能仍然成功"
    fi
}

# 显示使用说明
show_usage() {
    echo ""
    print_success "安装完成！"
    echo ""
    echo "使用方法："
    echo "  npm start              # 运行程序"
    echo "  npm run dev            # 开发模式"
    echo "  npm start -- --help    # 显示帮助"
    echo ""
    echo "项目结构："
    echo "  src/                   # TypeScript源代码"
    echo "  dist/                  # 编译后的JavaScript"
    echo "  logs/                  # 测试结果日志"
    echo ""
    echo "开发命令："
    echo "  npm run build          # 编译TypeScript"
    echo "  npm run clean          # 清理编译文件"
    echo ""
}

# 主安装流程
main() {
    echo "========================================"
    echo "  Mac硬盘速度测试工具 - TypeScript版"
    echo "           安装脚本"
    echo "========================================"
    echo ""
    
    check_requirements
    echo ""
    
    install_dependencies
    echo ""
    
    build_project
    echo ""
    
    run_test
    echo ""
    
    show_usage
}

# 错误处理
trap 'print_error "安装过程中发生错误，请检查上述输出"; exit 1' ERR

# 运行主程序
main
