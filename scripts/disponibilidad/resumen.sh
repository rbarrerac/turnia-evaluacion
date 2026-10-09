#!/usr/bin/env bash
# Módulo: Resumen de disponibilidad (RNF-04) a partir del CSV de registrar.sh
# Proyecto: Turnia
# Autor: Ronald
# Fecha de creación: 08/10/2026
#
# Considera solo las verificaciones dentro de la franja de servicio, de 6:00 a 22:00
# hora de Guatemala (las de fuera se cuentan aparte y se ignoran). Muestra, por día y
# en total: verificaciones, % de éxito (código 200), verificaciones fallidas, caídas
# (episodios de fallas consecutivas) y tiempo de respuesta promedio y máximo de las
# respuestas exitosas.
#
# Uso:  scripts/disponibilidad/resumen.sh [ruta_del_csv]
# Requiere solo bash, awk, date (GNU), cut y paste, presentes en Raspberry Pi OS.
set -euo pipefail

DIRECTORIO_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIRECTORIO_PROYECTO="$(cd "$DIRECTORIO_SCRIPT/../.." && pwd)"
ARCHIVO_CSV="${1:-$DIRECTORIO_PROYECTO/registros/disponibilidad.csv}"

HORA_INICIO=6   # 06:00 incluida
HORA_FIN=22     # 22:00 excluida (la última verificación válida es 21:59)
# Guatemala usa UTC-6 todo el año (sin horario de verano desde 2006). La zona POSIX
# "CST6" equivale a America/Guatemala y no depende de que el sistema tenga tzdata.
ZONA_GUATEMALA="CST6"

if [ ! -f "$ARCHIVO_CSV" ]; then
  echo "No existe el archivo $ARCHIVO_CSV. Primero programa registrar.sh con cron (ver DESPLIEGUE.md)." >&2
  exit 1
fi

TEMPORAL="$(mktemp)"
trap 'rm -f "$TEMPORAL"' EXIT

# 1) Se descartan el encabezado y las líneas mal formadas.
LC_ALL=C awk -F, 'NF == 3 && $1 ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T/ && $2 ~ /^[0-9]+$/ && $3 ~ /^[0-9]+$/' \
  "$ARCHIVO_CSV" > "$TEMPORAL"

if [ ! -s "$TEMPORAL" ]; then
  echo "El archivo $ARCHIVO_CSV no tiene verificaciones registradas todavía."
  exit 0
fi

echo "Resumen de disponibilidad — franja de ${HORA_INICIO}:00 a ${HORA_FIN}:00 (hora de Guatemala)"
echo "Archivo: $ARCHIVO_CSV"
echo

# 2) Cada fecha ISO (con su desfase) se convierte a día y hora de Guatemala con una sola
#    llamada a date (-f lee todas las fechas de la entrada) y se une con código y tiempo.
# 3) awk agrupa por día y calcula los indicadores.
paste -d, \
  <(cut -d, -f1 "$TEMPORAL" | TZ="$ZONA_GUATEMALA" date -f - '+%Y-%m-%d,%H') \
  <(cut -d, -f2,3 "$TEMPORAL") |
LC_ALL=C awk -F, -v inicio="$HORA_INICIO" -v fin="$HORA_FIN" '
  function imprimir(etiqueta, total, ok, caidas, suma, maximo,    fallidas, porcentaje, promedio) {
    fallidas = total - ok
    porcentaje = (total > 0) ? 100 * ok / total : 0
    promedio = (ok > 0) ? suma / ok : 0
    printf "%-12s %8d %9.2f%% %9d %7d %10.0f %9d\n", etiqueta, total, porcentaje, fallidas, caidas, promedio, maximo
  }
  {
    dia = $1; hora = $2 + 0; codigo = $3; ms = $4 + 0
    if (hora < inicio || hora >= fin) { fuera++; next }

    if (!(dia in total)) { orden[++dias] = dia }
    total[dia]++; totalGeneral++

    if (codigo == "200") {
      ok[dia]++; okGeneral++
      suma[dia] += ms; sumaGeneral += ms
      if (ms > maximo[dia]) maximo[dia] = ms
      if (ms > maximoGeneral) maximoGeneral = ms
      enFalla[dia] = 0; enFallaGeneral = 0
    } else {
      # Una caída es un episodio: varias verificaciones fallidas seguidas cuentan como una.
      if (!enFalla[dia]) { caidas[dia]++ }
      if (!enFallaGeneral) { caidasGeneral++ }
      enFalla[dia] = 1; enFallaGeneral = 1
    }
  }
  END {
    if (totalGeneral == 0) {
      print "No hay verificaciones dentro de la franja de servicio."
      printf "Verificaciones fuera de la franja (ignoradas): %d\n", fuera
      exit
    }
    # Anchos +1 en las columnas con tilde: con LC_ALL=C, printf cuenta bytes (á = 2 bytes).
    printf "%-13s %8s %11s %9s %8s %10s %10s\n", "Día", "Verif.", "Éxito", "Fallidas", "Caídas", "Prom. ms", "Máx. ms"
    printf "%-12s %8s %10s %9s %7s %10s %9s\n", "------------", "--------", "----------", "---------", "-------", "----------", "---------"
    for (i = 1; i <= dias; i++) {
      d = orden[i]
      imprimir(d, total[d], ok[d] + 0, caidas[d] + 0, suma[d], maximo[d] + 0)
    }
    printf "%-12s %8s %10s %9s %7s %10s %9s\n", "------------", "--------", "----------", "---------", "-------", "----------", "---------"
    imprimir("TOTAL", totalGeneral, okGeneral + 0, caidasGeneral + 0, sumaGeneral, maximoGeneral + 0)
    print ""
    printf "Verificaciones fuera de la franja (ignoradas): %d\n", fuera
    print "Éxito = respuestas con código 200. Los tiempos son de las respuestas exitosas."
    print "Una caída es un periodo de verificaciones fallidas consecutivas (código distinto de 200 o 000 = sin respuesta)."
  }
'
