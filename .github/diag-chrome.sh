#!/usr/bin/env bash
# diagnostico temporario do CI-UBUNTU (sera removido)
set -u
mkdir -p /tmp/keep
mon() {
  while true; do
    for d in /tmp/cm-geometria-*; do
      [ -d "$d" ] || continue
      n=$(basename "$d")
      if [ ! -d "/tmp/keep/$n" ] && [ -f "$d/pagina.html" ]; then
        mkdir -p "/tmp/keep/$n"; cp "$d"/*.html "$d"/*.css "/tmp/keep/$n/" 2>/dev/null
      fi
    done
    used=$(free -m | awk 'NR==2{print $3}')
    echo "MON $(date +%T) used=$used" >> /tmp/mon.log
    if [ "$used" -gt 9000 ]; then pkill -9 -x chrome; pkill -9 -f '[v]itest'; pkill -9 -x MainThread; echo "MON GUARD" >> /tmp/mon.log; fi
    sleep 1
  done
}
mon > /dev/null 2>&1 &
MONPID=$!
npm run build > /tmp/build.log 2>&1; echo "build=$?"
timeout 60 npx vitest run src/componentes/casca/geometria.test.tsx > /tmp/vt.log 2>&1 || true
pkill -9 -x chrome || true
sleep 2
kill $MONPID || true
grep -c GUARD /tmp/mon.log
echo "== paginas guardadas"; ls /tmp/keep | head
d=$(ls -d /tmp/keep/*/ | head -n 1)
echo "== usando $d"; ls "$d"
d=${d%/}
sed -i "s#/tmp/cm-geometria-[A-Za-z0-9]*#$d#g" "$d/pagina.html"
alvo="$d/pagina.html"; grep -o 'href="[^"]*"' "$alvo" | head -n 3
base="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-software-rasterizer --disable-extensions --disable-background-networking --no-first-run --allow-file-access-from-files --force-device-scale-factor=1 --window-size=616,900 --virtual-time-budget=3000 --dump-dom"
i=0
for extra in "" "--disable-gpu-compositing" "--disable-3d-apis --disable-webgl" "--force-prefers-reduced-motion" "--disable-features=CalculateNativeWinOcclusion,Vulkan --use-angle=swiftshader" "--in-process-gpu" "--virtual-time-budget=500"; do
  i=$((i+1)); echo "VAR $i extra=[$extra]"
  rm -f /tmp/out.txt
  google-chrome $base $extra --user-data-dir=/tmp/v$i "file://$alvo" > /tmp/out.txt 2>/dev/null &
  cp=$!
  max=0; s=$(date +%s)
  for t in $(seq 1 20); do
    sleep 1
    used=$(free -m | awk 'NR==2{print $3}'); [ "$used" -gt "$max" ] && max=$used
    kill -0 $cp 2>/dev/null || break
    [ "$used" -gt 7500 ] && break
  done
  pkill -9 -x chrome || true
  echo "VAR $i fim secs=$(( $(date +%s) - s )) maxUsedMB=$max resultado=$(grep -c innerWidth /tmp/out.txt)"
  sleep 2
done
exit 0
