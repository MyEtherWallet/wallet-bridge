#!/bin/sh

set -e

cd $(dirname $0)

TARGET=$1
VERSION=$(cat /release/build/VERSION)

INSTALLER=trezor-bridge-$VERSION-$TARGET-install.exe

cd /release/build

cp /release/walletd.nsis walletd.nsis
cp /release/walletd.ico walletd.ico

SIGNKEY=/release/authenticode

if [ -r $SIGNKEY.der ]; then
    for BINARY in {walletd}-{32b,64b}.exe ; do
        mv $BINARY $BINARY.unsigned
        osslsigncode sign -certs $SIGNKEY.p7b -key $SIGNKEY.der -n "Wallet Bridge" -i "https://www.myetherwallet.com/" -h sha256 -t "http://timestamp.comodoca.com?td=sha256" -in $BINARY.unsigned -out $BINARY
        osslsigncode verify -in $BINARY
    done
fi

makensis -X"OutFile $INSTALLER" -X'InstallDir "$PROGRAMFILES64\Wallet Bridge"' walletd.nsis

if [ -r $SIGNKEY.der ]; then
    mv $INSTALLER $INSTALLER.unsigned
    osslsigncode sign -certs $SIGNKEY.p7b -key $SIGNKEY.der -n "Wallet Bridge" -i "https://www.myetherwallet.com/" -h sha256 -t "http://timestamp.comodoca.com?td=sha256" -in $INSTALLER.unsigned -out $INSTALLER
    osslsigncode verify -in $INSTALLER
fi
