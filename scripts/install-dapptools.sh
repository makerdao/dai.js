#!/usr/bin/env bash
# run this file with "source" or "." so it can affect the environment

set -e

curl https://nixos.org/nix/install | sh
. ~/.nix-profile/etc/profile.d/nix.sh
nix-env -if https://github.com/cachix/cachix/tarball/master \
  --substituters https://cachix.cachix.org \
  --trusted-public-keys cachix.cachix.org-1:eWNHQldwUO7G2VkjpnjDbWwy4KQ/HNxht7H4SSoMckM=
cachix use dapp
git clone --recursive https://github.com/dapphub/dapptools
cd dapptools
make install
cd ..
