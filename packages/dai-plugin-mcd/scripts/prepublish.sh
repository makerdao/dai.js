#!/usr/bin/env bash

if [ $(basename $(pwd)) != "dai-plugin-mcd" ]; then
  echo "This script must be run from the dai-plugin-mcd directory."
  exit
fi

if [[ -z "$SKIP_VERSION_UPDATE" ]]; then
  yarn version
fi

./scripts/build.sh
