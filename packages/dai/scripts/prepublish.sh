#!/bin/bash

if [ $(basename $(pwd)) != "dai" ]; then
  echo "This script must be run from the dai directory."
  exit
fi

if [ ! SKIP_VERSION_UPDATE ]; then
  yarn version
fi

./scripts/build-backend.sh
