#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
BUILD=${BUILD_DIR:-"$ROOT/.build"}
mkdir -p "$BUILD" "$ROOT/dist"
BUILD=$(cd "$BUILD" && pwd)
readarray -t PINS < <(python3 -c '
import json, sys
pins = json.load(open(sys.argv[1]))
for key in ("xedCommit", "mbuildCommit", "emsdkCommit", "emscriptenVersion"):
    print(pins[key])
' "$ROOT/upstream.json")

pin_repository() {
  local directory=$1 repository=$2 commit=$3
  if [[ ! -d "$directory/.git" ]]; then
    git clone --quiet --filter=blob:none "$repository" "$directory"
  fi
  if [[ $(git -C "$directory" rev-parse HEAD) != "$commit" ]]; then
    git -C "$directory" fetch --quiet origin "$commit"
    git -C "$directory" checkout --quiet --detach "$commit"
  fi
  [[ $(git -C "$directory" rev-parse HEAD) == "$commit" ]]
  [[ -z $(git -C "$directory" status --porcelain --untracked-files=normal) ]]
}

pin_repository "$BUILD/xed" https://github.com/intelxed/xed.git "${PINS[0]}"
pin_repository "$BUILD/mbuild" https://github.com/intelxed/mbuild.git "${PINS[1]}"
EMSDK=${EMSDK_DIR:-"$BUILD/emsdk"}
pin_repository "$EMSDK" https://github.com/emscripten-core/emsdk.git "${PINS[2]}"
if [[ ! -f "$EMSDK/.emscripten" ]]; then
  "$EMSDK/emsdk" install "${PINS[3]}"
  "$EMSDK/emsdk" activate "${PINS[3]}"
fi
# emsdk_env.sh reads optional variables that may be unset.
export EMSDK_QUIET=1
set +u
source "$EMSDK/emsdk_env.sh" >/dev/null
set -u
emcc --version | head -1 | grep -F " ${PINS[3]} "
cmp "$BUILD/xed/LICENSE" "$ROOT/licenses/XED.txt"
cmp "$EMSDK/upstream/emscripten/LICENSE" "$ROOT/licenses/emscripten-LICENSE.txt"
cmp "$EMSDK/upstream/emscripten/AUTHORS" "$ROOT/licenses/emscripten-AUTHORS.txt"
cmp "$EMSDK/upstream/emscripten/system/lib/libc/musl/COPYRIGHT" "$ROOT/licenses/musl.txt"
cmp "$EMSDK/upstream/emscripten/system/lib/compiler-rt/LICENSE.TXT" \
  "$ROOT/licenses/compiler-rt.txt"

python3 "$BUILD/xed/mfile.py" --compiler=clang --cc=emcc --cxx=em++ --ar=emar \
  --host-cpu=ia32 --no-encoder --limit-strings --opt=3 --extra-ccflags=-Oz \
  --build-dir="$BUILD/obj32" -j "${JOBS:-4}" -s
emcc -Oz -flto "$ROOT/native/bridge.c" "$BUILD/obj32/libxed.a" \
  -I"$BUILD/obj32/wkit/include" \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node \
  -sFILESYSTEM=0 -sMALLOC=none \
  -sEXPORTED_FUNCTIONS=_xed_decode_one,_xed_initialize,_xed_input \
  -sEXPORTED_RUNTIME_METHODS=UTF8ToString,HEAPU8 \
  -o "$ROOT/dist/xed.js"
"$EMSDK/upstream/bin/wasm-opt" --all-features -Oz --strip-producers "$ROOT/dist/xed.wasm" \
  -o "$ROOT/dist/xed-optimized.wasm"
mv "$ROOT/dist/xed-optimized.wasm" "$ROOT/dist/xed.wasm"
node "$ROOT/scripts/write-build-info.mjs"
node "$ROOT/scripts/build.mjs"
