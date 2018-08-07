#!/usr/bin/env bash
# run this file with "source" or "." so it can affect the environment

set -e

sudo mkdir -m 0755 /nix && sudo chown travis /nix
sudo mount -o bind /home/travis/build/makerdao/dai.js/nix /nix
curl https://dapp.tools/install | sh
. /home/travis/.nix-profile/etc/profile.d/nix.sh
