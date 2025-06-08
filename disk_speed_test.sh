#!/bin/bash

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

# 显示进度条
show_progress() {
    local current=$1
    local total=$2
    local prefix=$3
    local elapsed_time=$4
    local bar_length=40

    # 计算进度百分比
    local percent=$((current * 100 / total))
    local filled_length=$((current * bar_length / total))

    # 构建进度条
    local bar=""
    for ((i=0; i<filled_length; i++)); do
        bar+="█"
    done
    for ((i=filled_length; i<bar_length; i++)); do
        bar+="░"
    done

    # 计算速度和剩余时间
    local speed_info=""
    if [ -n "$elapsed_time" ] && [ "$elapsed_time" != "0" ] && [ "$current" -gt 0 ]; then
        local speed_mbps=$(echo "scale=1; $current / 1024 / 1024 / $elapsed_time" | bc 2>/dev/null || echo "0")
        if [ "$percent" -gt 0 ] && [ "$percent" -lt 100 ]; then
            local eta=$(echo "scale=1; $elapsed_time * (100 - $percent) / $percent" | bc 2>/dev/null || echo "0")
            speed_info=" ${speed_mbps}MB/s ETA:${eta}s"
        else
            speed_info=" ${speed_mbps}MB/s"
        fi
    fi

    # 显示进度条（使用\r回到行首，不换行）
    printf "\r${BLUE}[INFO]${NC} %s [%s] %3d%%%s" "$prefix" "$bar" "$percent" "$speed_info"
}

# 获取文件大小（字节）
get_file_size() {
    local file=$1
    if [ -f "$file" ]; then
        stat -f%z "$file" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# 模拟dd命令的进度显示
dd_with_progress() {
    local input_file=$1
    local output_file=$2
    local block_size=$3
    local count=$4
    local operation=$5  # "写入" 或 "读取"

    # 启动dd命令在后台
    dd if="$input_file" of="$output_file" bs="$block_size" count="$count" 2>/dev/null &
    local dd_pid=$!

    # 显示进度
    local current=0
    while kill -0 $dd_pid 2>/dev/null; do
        show_progress $current $count "${operation}中"
        sleep 0.1
        current=$((current + count / 50))  # 模拟进度增长
        if [ $current -gt $count ]; then
            current=$count
        fi
    done

    # 确保进度条显示100%
    show_progress $count $count "${operation}中"
    echo ""  # 换行

    # 等待dd命令完成
    wait $dd_pid
    return $?
}

# 显示帮助信息
show_help() {
    echo "Mac硬盘速度测试脚本"
    echo ""
    echo "用法: $0 [硬盘路径] [文件大小]"
    echo ""
    echo "参数:"
    echo "  硬盘路径    要测试的硬盘挂载路径 (可选，不提供则显示选择菜单)"
    echo "  文件大小    测试文件大小: 1g, 5g, 10g (可选，不提供则显示选择菜单)"
    echo ""
    echo "示例:"
    echo "  $0                    # 交互式选择硬盘和文件大小"
    echo "  $0 / 1g              # 测试根目录，使用1GB文件"
    echo "  $0 /Volumes/USB 5g   # 测试USB硬盘，使用5GB文件"
    echo ""
}

# 获取所有挂载的硬盘
get_mounted_disks() {
    # 使用df命令获取挂载点，过滤掉系统和临时文件系统，并处理包含空格的挂载点
    df -h | grep -E '^/dev/' | grep -v -E '(devfs|map|tmpfs)' | while IFS= read -r line; do
        # 解析df输出，处理包含空格的挂载点
        device=$(echo "$line" | awk '{print $1}')
        size=$(echo "$line" | awk '{print $2}')
        used=$(echo "$line" | awk '{print $3}')
        avail=$(echo "$line" | awk '{print $4}')
        # 获取挂载点（可能包含空格）
        mount_point=$(echo "$line" | awk '{for(i=9;i<=NF;i++) printf "%s%s", $i, (i==NF?"":" ")}')

        # 跳过系统卷，只显示用户可能想要测试的硬盘
        if [[ "$mount_point" =~ ^/System/Volumes/(VM|Preboot|Update|xarts|iSCPreboot|Hardware)$ ]]; then
            continue
        fi

        # 获取硬盘类型信息
        disk_info=$(diskutil info "$device" 2>/dev/null | grep -E "(Media Name|Protocol)" | head -2 | sed 's/.*: *//' | tr '\n' ' ' | sed 's/  */ /g' || echo "Unknown")

        echo "$mount_point|$size|$avail|$device|$disk_info"
    done
}

# 显示硬盘选择菜单
show_disk_menu() {
    local disk_list=$(get_mounted_disks)

    if [ -z "$disk_list" ]; then
        print_error "未找到可用的硬盘"
        exit 1
    fi

    local disks=()
    local disk_details=()
    local index=1

    print_info "请选择要测试的硬盘:" >&2
    echo "" >&2

    while IFS='|' read -r mount_point size avail device disk_info; do
        if [ -n "$mount_point" ]; then
            disks+=("$mount_point")
            disk_details+=("$mount_point|$size|$avail|$device|$disk_info")
            printf "%2d) %-25s [%8s] 可用: %-8s 设备: %-15s %s\n" \
                "$index" "$mount_point" "$size" "$avail" "$device" "$disk_info" >&2
            ((index++))
        fi
    done <<< "$disk_list"

    if [ "${#disks[@]}" -eq 0 ]; then
        print_error "未找到可用的硬盘"
        exit 1
    fi

    echo "" >&2
    while true; do
        read -p "请输入硬盘序号 (1-${#disks[@]}): " choice >&2

        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#disks[@]}" ]; then
            selected_disk="${disks[$((choice-1))]}"
            selected_disk_detail="${disk_details[$((choice-1))]}"
            print_success "已选择硬盘: $selected_disk" >&2
            # 输出格式: 硬盘路径|硬盘详细信息
            echo "$selected_disk|$selected_disk_detail"
            break
        else
            print_error "无效的选择，请输入 1-${#disks[@]} 之间的数字"
        fi
    done
}

# 显示文件大小选择菜单
show_size_menu() {
    print_info "请选择测试文件大小:" >&2
    echo "" >&2
    echo "1) 1GB  - 快速测试" >&2
    echo "2) 5GB  - 标准测试" >&2
    echo "3) 10GB - 深度测试" >&2
    echo "" >&2

    while true; do
        read -p "请输入文件大小序号 (1-3): " choice >&2

        case $choice in
            1)
                print_success "已选择: 1GB 快速测试" >&2
                echo "1g"
                break
                ;;
            2)
                print_success "已选择: 5GB 标准测试" >&2
                echo "5g"
                break
                ;;
            3)
                print_success "已选择: 10GB 深度测试" >&2
                echo "10g"
                break
                ;;
            *)
                print_error "无效的选择，请输入 1、2 或 3"
                ;;
        esac
    done
}

# 转换文件大小为字节数
get_file_size_bytes() {
    case $1 in
        "1g") echo "1073741824" ;;   # 1GB
        "5g") echo "5368709120" ;;   # 5GB
        "10g") echo "10737418240" ;; # 10GB
        *)
            print_error "不支持的文件大小: $1"
            exit 1
            ;;
    esac
}

# 检查磁盘空间
check_disk_space() {
    local disk_path=$1
    local required_size=$2
    
    local available_bytes=$(df "$disk_path" | tail -1 | awk '{print $4}')
    available_bytes=$((available_bytes * 1024))  # 转换为字节
    
    if [ "$available_bytes" -lt "$((required_size * 2))" ]; then
        print_error "磁盘空间不足！需要至少 $((required_size * 2 / 1024 / 1024 / 1024))GB 可用空间"
        exit 1
    fi
}

# 执行写入速度测试
test_write_speed() {
    local test_file=$1
    local file_size=$2
    local block_size="1m"
    local count=$((file_size / 1024 / 1024))

    # 将信息输出到stderr，避免影响函数返回值
    print_info "开始写入速度测试..." >&2

    # 清除系统缓存
    sudo purge 2>/dev/null || true

    # 执行写入测试并显示进度条
    local start_time=$(date +%s.%N)

    # 启动dd命令在后台
    dd if=/dev/zero of="$test_file" bs="$block_size" count="$count" conv=fsync 2>/dev/null &
    local dd_pid=$!

    # 显示进度条
    local target_size=$file_size
    local current_size=0
    local progress_start_time=$start_time

    while kill -0 $dd_pid 2>/dev/null; do
        current_size=$(get_file_size "$test_file")
        if [ "$current_size" -gt "$target_size" ]; then
            current_size=$target_size
        fi
        local current_time=$(date +%s.%N)
        local elapsed=$(echo "$current_time - $progress_start_time" | bc)
        show_progress $current_size $target_size "写入数据" "$elapsed" >&2
        sleep 0.1
    done

    # 确保进度条显示100%
    local final_time=$(date +%s.%N)
    local final_elapsed=$(echo "$final_time - $progress_start_time" | bc)
    show_progress $target_size $target_size "写入数据" "$final_elapsed" >&2
    echo "" >&2  # 换行

    # 等待dd命令完成
    wait $dd_pid
    local end_time=$(date +%s.%N)

    local duration=$(echo "$end_time - $start_time" | bc)
    local speed_mbps=$(echo "scale=2; $file_size / 1024 / 1024 / $duration" | bc)

    echo "$speed_mbps"
}

# 执行读取速度测试
test_read_speed() {
    local test_file=$1
    local file_size=$2
    local block_size="1m"
    local count=$((file_size / 1024 / 1024))

    # 将信息输出到stderr，避免影响函数返回值
    print_info "开始读取速度测试..." >&2

    # 清除系统缓存
    sudo purge 2>/dev/null || true

    # 执行读取测试并显示进度条
    local start_time=$(date +%s.%N)

    # 启动dd命令在后台
    dd if="$test_file" of=/dev/null bs="$block_size" 2>/dev/null &
    local dd_pid=$!

    # 显示进度条 - 对于读取，我们模拟进度
    local target_size=$file_size
    local progress_steps=50
    local step_size=$((target_size / progress_steps))
    local current_size=0
    local progress_start_time=$start_time

    while kill -0 $dd_pid 2>/dev/null; do
        local current_time=$(date +%s.%N)
        local elapsed=$(echo "$current_time - $progress_start_time" | bc)
        show_progress $current_size $target_size "读取数据" "$elapsed" >&2
        sleep 0.1
        current_size=$((current_size + step_size))
        if [ "$current_size" -gt "$target_size" ]; then
            current_size=$target_size
        fi
    done

    # 确保进度条显示100%
    local final_time=$(date +%s.%N)
    local final_elapsed=$(echo "$final_time - $progress_start_time" | bc)
    show_progress $target_size $target_size "读取数据" "$final_elapsed" >&2
    echo "" >&2  # 换行

    # 等待dd命令完成
    wait $dd_pid
    local end_time=$(date +%s.%N)

    local duration=$(echo "$end_time - $start_time" | bc)
    local speed_mbps=$(echo "scale=2; $file_size / 1024 / 1024 / $duration" | bc)

    echo "$speed_mbps"
}

# 保存测试结果到日志文件
save_test_results() {
    local disk_path=$1
    local disk_detail=$2
    local file_size_str=$3
    local write_speeds=("${!4}")
    local read_speeds=("${!5}")
    local write_avg=$6
    local read_avg=$7

    # 创建logs目录
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local logs_dir="$script_dir/logs"
    mkdir -p "$logs_dir"

    # 生成日志文件名
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local disk_name=$(echo "$disk_path" | sed 's/[^a-zA-Z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_\|_$//g')
    local log_file="$logs_dir/disk_test_${disk_name}_${file_size_str}_${timestamp}.log"

    # 写入测试结果
    {
        echo "========================================"
        echo "Mac硬盘速度测试结果"
        echo "========================================"
        echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "测试路径: $disk_path"
        echo "文件大小: $file_size_str"
        echo ""

        # 解析硬盘详细信息
        if [ -n "$disk_detail" ]; then
            IFS='|' read -r mount_point size avail device disk_info <<< "$disk_detail"
            echo "硬盘信息:"
            echo "  挂载点: $mount_point"
            echo "  总容量: $size"
            echo "  可用空间: $avail"
            echo "  设备: $device"
            echo "  类型: $disk_info"
            echo ""
        fi

        echo "详细测试结果:"
        for i in {0..2}; do
            echo "第$((i+1))轮 - 写入: ${write_speeds[i]} MB/s  读取: ${read_speeds[i]} MB/s"
        done
        echo ""
        echo "平均速度:"
        echo "  写入: $write_avg MB/s"
        echo "  读取: $read_avg MB/s"
        echo ""
        echo "========================================"
    } > "$log_file"

    print_success "测试结果已保存到: $log_file"
}

# 主测试函数
run_speed_test() {
    local disk_path=$1
    local disk_detail=$2
    local file_size_str=$3
    local file_size_bytes=$(get_file_size_bytes "$file_size_str")

    print_info "开始硬盘速度测试"
    print_info "测试路径: $disk_path"
    print_info "文件大小: $file_size_str ($(echo "scale=1; $file_size_bytes / 1024 / 1024 / 1024" | bc)GB)"
    
    # 检查磁盘空间
    check_disk_space "$disk_path" "$file_size_bytes"
    
    # 创建测试文件路径
    local test_file="$disk_path/disk_speed_test_$(date +%s).tmp"
    
    # 存储测试结果
    local write_speeds=()
    local read_speeds=()
    
    echo ""
    print_info "开始进行3轮测试..."
    
    for i in {1..3}; do
        echo ""
        print_info "=== 第 $i 轮测试 ==="
        
        # 写入测试
        local write_speed=$(test_write_speed "$test_file" "$file_size_bytes")
        write_speeds+=("$write_speed")
        print_success "写入速度: ${write_speed} MB/s"
        
        # 读取测试
        local read_speed=$(test_read_speed "$test_file" "$file_size_bytes")
        read_speeds+=("$read_speed")
        print_success "读取速度: ${read_speed} MB/s"
        
        # 删除测试文件准备下一轮
        rm -f "$test_file"
        
        # 等待一秒再进行下一轮测试
        if [ "$i" -lt 3 ]; then
            sleep 1
        fi
    done
    
    # 计算平均值
    local write_avg=$(echo "${write_speeds[@]}" | tr ' ' '\n' | awk '{sum+=$1} END {printf "%.2f", sum/NR}')
    local read_avg=$(echo "${read_speeds[@]}" | tr ' ' '\n' | awk '{sum+=$1} END {printf "%.2f", sum/NR}')
    
    # 显示结果
    echo ""
    echo "========================================"
    print_success "测试完成！"
    echo "========================================"
    echo ""
    printf "%-15s: %s\n" "测试硬盘" "$disk_path"
    printf "%-15s: %s\n" "测试文件大小" "$file_size_str"
    echo ""
    echo "详细结果:"
    for i in {0..2}; do
        printf "第%d轮 - 写入: %8.2f MB/s  读取: %8.2f MB/s\n" \
            $((i+1)) "${write_speeds[i]}" "${read_speeds[i]}"
    done
    echo ""
    printf "平均速度 - 写入: %8.2f MB/s  读取: %8.2f MB/s\n" "$write_avg" "$read_avg"
    echo "========================================"

    # 保存测试结果到日志文件
    save_test_results "$disk_path" "$disk_detail" "$file_size_str" write_speeds[@] read_speeds[@] "$write_avg" "$read_avg"

    # 清理测试文件
    rm -f "$test_file"
}

# 主程序
main() {
    echo "========================================"
    echo "        Mac硬盘速度测试工具"
    echo "========================================"
    echo ""

    # 检查是否需要显示帮助
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
        exit 0
    fi

    # 检查必要的命令
    for cmd in df diskutil dd bc; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "缺少必要的命令: $cmd"
            exit 1
        fi
    done

    # 显示当前挂载的硬盘信息
    print_info "正在扫描挂载的硬盘..."
    local disk_list=$(get_mounted_disks)

    if [ -n "$disk_list" ]; then
        echo ""
    else
        print_error "未找到可用的硬盘"
        exit 1
    fi
    
    # 交互式选择硬盘
    local disk_selection=$(show_disk_menu)
    local disk_path=$(echo "$disk_selection" | cut -d'|' -f1)
    local disk_detail=$(echo "$disk_selection" | cut -d'|' -f2-)

    # 验证硬盘路径
    if [ ! -d "$disk_path" ]; then
        print_error "硬盘路径不存在: $disk_path"
        exit 1
    fi

    # 交互式选择文件大小
    echo ""
    local file_size=$(show_size_menu)

    # 运行测试
    echo ""
    run_speed_test "$disk_path" "$disk_detail" "$file_size"
}

# 捕获中断信号，确保清理测试文件
cleanup() {
    print_warning "测试被中断，正在清理..."
    rm -f "$disk_path"/disk_speed_test_*.tmp 2>/dev/null || true
    exit 1
}

trap cleanup INT TERM

# 运行主程序
main "$@"
