#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

bash scripts/stop.sh
echo ""
echo "Services stopped. Press Enter to close."
read -r
