#!/usr/bin/env bash
# gpu-phase2: a read-only inventory of Apollo's GPU, toolchain and host state, as JSON on stdout. Changes nothing.
#   tools/gpu-phase2/inventory.sh > research/gpu-phase2/results/inventory/<name>.json
set -u
CU=$(ls -d /home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv/lib/python3*/site-packages/nvidia/cu13 2>/dev/null | head -1)
TK=/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit
q() { nvidia-smi --query-gpu="$1" --format=csv,noheader,nounits 2>/dev/null | head -1 | sed 's/^ *//;s/ *$//'; }
j() { python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'; }
apps=$(nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader 2>/dev/null | j)
procs=$(nvidia-smi 2>/dev/null | sed -n '/Processes:/,$p' | j)
cat <<EOF
{
  "takenUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "host": "$(hostname)",
  "os": $(grep PRETTY_NAME /etc/os-release | cut -d= -f2),
  "kernel": "$(uname -r)",
  "cpu": "$(lscpu | sed -n 's/^Model name: *//p')",
  "cpuThreads": $(nproc),
  "memTotalBytes": $(awk '/MemTotal/{print $2*1024}' /proc/meminfo),
  "memAvailableBytes": $(awk '/MemAvailable/{print $2*1024}' /proc/meminfo),
  "swapTotalBytes": $(awk '/SwapTotal/{print $2*1024}' /proc/meminfo),
  "swapFreeBytes": $(awk '/SwapFree/{print $2*1024}' /proc/meminfo),
  "gpu": {
    "name": "$(q name)",
    "uuid": "$(q uuid)",
    "pciBusId": "$(q pci.bus_id)",
    "vbios": "$(q vbios_version)",
    "driver": "$(q driver_version)",
    "computeCap": "$(q compute_cap)",
    "memoryTotalMiB": $(q memory.total),
    "memoryUsedMiB": $(q memory.used),
    "memoryFreeMiB": $(q memory.free),
    "temperatureC": $(q temperature.gpu),
    "powerDrawW": $(q power.draw),
    "powerLimitW": $(q power.limit),
    "utilizationPct": $(q utilization.gpu),
    "persistenceMode": "$(q persistence_mode)",
    "displayAttached": "$(nvidia-smi -q 2>/dev/null | sed -n 's/^ *Display Attached *: *//p' | head -1)",
    "displayActive": "$(nvidia-smi -q 2>/dev/null | sed -n 's/^ *Display Active *: *//p' | head -1)",
    "computeApps": $apps,
    "processTable": $procs
  },
  "cudaDriverApi": "$(nvidia-smi | sed -n 's/.*CUDA Version: *\([0-9.]*\).*/\1/p' | head -1)",
  "nvcc": $( ( [ -n "$CU" ] && "$CU/bin/nvcc" --version | tail -2 ) 2>/dev/null | j),
  "fullToolkit": $( ( [ -x "$TK/bin/nvcc" ] && "$TK/bin/nvcc" --version | tail -2 ) 2>/dev/null | j),
  "computeSanitizer": $( ( [ -x "$TK/compute-sanitizer/compute-sanitizer" ] && "$TK/compute-sanitizer/compute-sanitizer" --version ) 2>/dev/null | j),
  "gcc": "$(gcc --version | head -1)",
  "node": "$(node --version)",
  "docker": {
    "containers": $(docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' 2>/dev/null | j),
    "images": $(docker images --format '{{.Repository}}@{{.ID}}' 2>/dev/null | j)
  },
  "vllmProcesses": $(ps -eo pid=,comm=,args= | awk '$2 ~ /^(python|vllm|pt_main)/ && tolower($0) ~ /vllm|qwen/' | j),
  "gpuJobsOfThisRepo": $(ps -eo pid=,etime=,comm=,args= | awk '$3 ~ /^gp[12]/' | j),
  "systemdUserSlices": $(systemctl --user list-units --type=slice --no-legend 2>/dev/null | awk '{print $1}' | j)
}
EOF
