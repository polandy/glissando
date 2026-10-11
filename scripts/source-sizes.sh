#!/usr/bin/env bash
# Fails when a source file has grown past the point it should be split along its seams (a pure
# helper module, a sub-component, one test file per behaviour group).
set -euo pipefail
cd "$(dirname "$0")/.."

limit_lines=300
failed=0

# Excluded: src/app/i18n/catalogue-*.ts is pure translation data, one entry per line;
# src/import/libav/ is vendored third-party code we do not edit.
while IFS= read -r -d '' file; do
  lines="$(wc -l <"$file")"
  if ((lines > limit_lines)); then
    echo "FAIL $file is $lines lines, over the ${limit_lines}-line limit"
    failed=1
  fi
done < <(find src e2e scripts -type f \( -name '*.ts' -o -name '*.svelte' -o -name '*.js' -o -name '*.sh' \) \
  -not -path 'src/app/i18n/catalogue-*.ts' -not -path 'src/import/libav/*' -print0)

exit "$failed"
