#!/usr/bin/env bash


cd $(npm root) && cd ..  

CHECK_FILE="dist/src/Maker.js"
BUILD_BACKEND="./scripts/build-backend.sh"

if [ ! -f $CHECK_FILE ]; then
  echo "no dist/ present, building..."
  (exec "$BUILD_BACKEND")  
fi

CWD=`pwd`
DIST="$CWD/dist/src/"

cd "src" 

WATCHERS_READY=false

node ../scripts/watch-src.js | \
  while IFS= read -r line 
  do
    if [ "$WATCHERS_READY" = true ]; then
      ACTION=`echo $line | awk '{print $1;}'`
      FILE=`echo $line | awk '{print $2;}'`
      
      if [ "$ACTION" = "deleted" ]; then
        rm "$DIST$FILE"
      else
        babel $FILE -o $DIST$FILE
      fi

      echo "$ACTION $DIST$FILE"
    fi

    if [ "$line" = "loaded files, watching" ]; then
      WATCHERS_READY=true
      echo $line
    fi
done

