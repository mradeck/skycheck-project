#!/bin/bash
# Robuster Fetch+Process-Treiber für die Länder-Zusatzebenen (OSM/Overpass → data/<cc>-*.json).
# Idempotent: vorhandene, valide Ausgabedateien werden übersprungen (resume-fähig).
# Reihenfolge der Länder als Argumente, z. B.: bash scripts/fetch-context.sh dk ie es fr
cd "$(dirname "$0")/.." || exit 1
MIRRORS=("https://overpass.private.coffee/api/interpreter" "https://overpass-api.de/api/interpreter" "https://overpass.osm.jp/api/interpreter" "https://overpass.kumi.systems/api/interpreter")

# Fläche/Bbox je Land: FR = Metropol-Bbox (ohne Überseegebiete), sonst ISO-Fläche.
area_clause() {  # $1=ISO
  case $1 in
    FR) echo 'BBOX(41.30,-5.25,51.15,9.65)';;   # Platzhalter, unten ersetzt
    *)  echo 'area["ISO3166-1"="'$1'"][admin_level=2]->.a;';;
  esac
}
# Selektor je Ebene, mit Flächen-/Bbox-Suffix
sel() {  # $1=ISO $2=layer
  local ISO=$1 L=$2 A S
  if [ "$ISO" = "FR" ]; then S='(41.30,-5.25,51.15,9.65)'; A=''; else S='(area.a)'; A='area["ISO3166-1"="'$ISO'"][admin_level=2]->.a;'; fi
  case $L in
    motorways)  echo '[out:json][timeout:290];'$A'way["highway"~"^(motorway|trunk)$"]'$S';out geom;';;
    powerlines) echo '[out:json][timeout:290];'$A'way["power"="line"]["voltage"]'$S';out geom;';;
    rail)       echo '[out:json][timeout:290];'$A'way["railway"="rail"]["usage"="main"]'$S';out geom;';;
    protected)  echo '[out:json][timeout:290];'$A'(relation["boundary"="protected_area"]'$S';relation["boundary"="national_park"]'$S';relation["leisure"="nature_reserve"]'$S';way["boundary"="protected_area"]'$S';way["boundary"="national_park"]'$S';way["leisure"="nature_reserve"]'$S';);out geom;';;
  esac
}

for CC in "$@"; do
  ISO=$(echo "$CC" | tr a-z A-Z)
  for L in motorways powerlines rail protected; do
    OUT="data/${CC}-${L}.json"
    if node -e "JSON.parse(require('fs').readFileSync('$OUT'))" 2>/dev/null; then echo "[$CC $L] vorhanden, skip"; continue; fi
    Q=$(sel "$ISO" "$L")
    OK=0
    for TRY in 1 2 3 4 5 6; do
      EP=${MIRRORS[$(( (TRY-1) % ${#MIRRORS[@]} ))]}
      curl -s -G "$EP" --data-urlencode "data=$Q" -o "/tmp/${ISO}_${L}.json" --max-time 300
      if head -c1 "/tmp/${ISO}_${L}.json" 2>/dev/null | grep -q '{'; then
        echo "[$CC $L] OK via $EP ($(wc -c < /tmp/${ISO}_${L}.json) b, try $TRY)"; OK=1; break
      fi
      echo "[$CC $L] busy @ $EP (try $TRY), backoff…"; sleep $((TRY*10))
    done
    [ "$OK" = 1 ] || { echo "[$CC $L] FAILED nach Retries"; continue; }
    node scripts/gen-context.mjs "$CC" --only "$L" --raw "/tmp/${ISO}_${L}.json" 2>&1 | grep -E "Features|Elemente" | tail -1
  done
done
echo "ALL DONE: $*"
