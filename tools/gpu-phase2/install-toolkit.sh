#!/usr/bin/env bash
# gpu-phase2: installs a user-space CUDA 13.2.2 toolkit subset from NVIDIA's official redistributable archives
# (https://developer.download.nvidia.com/compute/cuda/redist/redistrib_13.2.2.json): the compiler (the same 13.2.86
# release as Phase 1's PyPI wheels), the runtime headers/libraries, compute-sanitizer 13.2.87 with its full directory
# layout, CUPTI and Nsight Compute. Nothing outside $TK is written; no apt, driver, PATH, display or system change.
#
#   tools/gpu-phase2/install-toolkit.sh [download-dir]
#
# Every archive is checked against the manifest's sha256 before extraction. The install record
# $TK/INSTALL_MANIFEST.json lists each component, version, archive sha256 and the files it installed.
# Uninstall: rm -rf /home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit (and the download directory).
set -euo pipefail
TK=/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit
DL=${1:-/home/chad/.local/share/margin-trading-gpu/downloads-13.2.2}
BASE=https://developer.download.nvidia.com/compute/cuda/redist
COMPONENTS="cuda_nvcc cuda_cudart cuda_crt cuda_cccl libnvvm cuda_nvrtc cuda_sanitizer_api cuda_cupti cuda_nvdisasm cuda_cuobjdump cuda_profiler_api cuda_nvml_dev nsight_compute"
mkdir -p "$TK" "$DL"
curl -fsS -m 60 "$BASE/redistrib_13.2.2.json" -o "$DL/redistrib_13.2.2.json"
python3 - "$DL" "$TK" $COMPONENTS <<'EOF'
import hashlib, json, os, subprocess, sys, tarfile, urllib.request
dl, tk, comps = sys.argv[1], sys.argv[2], sys.argv[3:]
base = 'https://developer.download.nvidia.com/compute/cuda/redist/'
m = json.load(open(os.path.join(dl, 'redistrib_13.2.2.json')))
record = {'release': m['release_label'], 'releaseDate': m['release_date'], 'source': base + 'redistrib_13.2.2.json',
          'prefix': tk, 'components': []}
for c in comps:
    x = m[c]['linux-x86_64']
    url = base + x['relative_path']
    f = os.path.join(dl, os.path.basename(x['relative_path']))
    if not os.path.exists(f) or hashlib.sha256(open(f, 'rb').read()).hexdigest() != x['sha256']:
        print(f'download {c} {m[c]["version"]} ({int(x["size"]) >> 20} MiB)', flush=True)
        subprocess.run(['curl', '-fsS', '-m', '1800', '-o', f, url], check=True)
    h = hashlib.sha256(open(f, 'rb').read()).hexdigest()
    if h != x['sha256']:
        raise SystemExit(f'{c}: sha256 {h} != manifest {x["sha256"]}')
    files = []
    with tarfile.open(f) as t:
        top = None
        for mem in t.getmembers():
            parts = mem.name.split('/', 1)
            top = parts[0]
            if len(parts) < 2 or not parts[1]:
                continue
            mem.name = parts[1]
            if mem.issym() or mem.islnk() or mem.isfile() or mem.isdir():
                t.extract(mem, tk, filter='tar')
                if not mem.isdir():
                    files.append(mem.name)
    record['components'].append({'name': c, 'version': m[c]['version'], 'archive': x['relative_path'],
                                 'sha256': h, 'files': len(files), 'fileList': sorted(files)})
    print(f'installed {c} {m[c]["version"]}: {len(files)} files', flush=True)
json.dump(record, open(os.path.join(tk, 'INSTALL_MANIFEST.json'), 'w'), indent=1)
print('ok', flush=True)
EOF
"$TK/bin/nvcc" --version | tail -2
[ -x "$TK/compute-sanitizer/compute-sanitizer" ] && "$TK/compute-sanitizer/compute-sanitizer" --version | head -3
ls "$TK"
