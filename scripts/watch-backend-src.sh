#!/usr/bin/env bash

# install inotify-tools - https://github.com/rvoicilas/inotify-tools/wiki

FILE="dist/src/Maker.js"
BUILD_BACKEND="./scripts/build-backend.sh"

if [ ! -f $FILE ]; then
  echo "no dist/ present, building..."
  (exec "$BUILD_BACKEND")  
fi

DIST="dist/"
CURPATH=`pwd`

inotifywait -mr --timefmt '%d/%m/%y %H:%M' --format '%T %w %f' \
-e close_write src/ | while read date time dir file; do

  FILECHANGE=${dir}${file}
  # convert absolute path to relative
  FILECHANGEREL=`echo "$FILECHANGE" | sed 's_'$CURPATH'/__'`
  babel $FILECHANGE -o $DIST$FILECHANGEREL
  echo "At ${time} on ${date}, file $FILECHANGE was compiled to $DIST$FILECHANGEREL"
done
