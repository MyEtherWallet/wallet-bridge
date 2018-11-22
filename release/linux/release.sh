#!/bin/sh

set -e

cd $(dirname $0)

GPGSIGNKEY=2FCA4A1E3AF4278F7AD3B7637F059C0F7B9A12F0
TARGET=$1
VERSION=$(cat /release/build/VERSION)

cd /release/build

install -D -m 0755 walletd-$TARGET          ./usr/bin/walletd
install -D -m 0644 /release/wallets.udev.rules    ./lib/udev/rules.d/60-walletd.rules
install -D -m 0644 /release/walletd.service ./usr/lib/systemd/system/walletd.service

# prepare GPG signing environment
GPG_PRIVKEY=/release/privkey.asc
if [ -r $GPG_PRIVKEY ]; then
    export GPG_TTY=$(tty)
    export LC_ALL=en_US.UTF-8
    gpg --import /release/privkey.asc
    GPG_SIGN=gpg
fi

NAME=wallet-bridge

rm -f *.tar.bz2
tar -cjf $NAME-$VERSION.tar.bz2 ./usr ./lib

for TYPE in "deb" "rpm"; do
    case "$TARGET-$TYPE" in
        linux-386-*)
            ARCH=i386
            ;;
        linux-amd64-deb)
            ARCH=amd64
            ;;
        linux-amd64-rpm)
            ARCH=x86_64
            ;;
        linux-arm-7-deb)
            ARCH=armhf
            ;;
        linux-arm-7-rpm)
            ARCH=armv7hl
            ;;
        linux-arm64-*)
            ARCH=arm64
            ;;
    esac
    fpm \
        -s tar \
        -t $TYPE \
        -a $ARCH \
        -n $NAME \
        -v $VERSION \
        -d systemd \
        --license "MIT" \
        --vendor "MyEtherWallet Inc" \
        --description "Communication daemon for Ethereum Wallets" \
        --maintainer "MyEtherWallet <dev@myetherwallet.com>" \
        --url "https://www.myetherwallet.com/" \
        --category "Productivity/Security" \
        --before-install /release/fpm.before-install.sh \
        --after-install /release/fpm.after-install.sh \
        --before-remove /release/fpm.before-remove.sh \
        $NAME-$VERSION.tar.bz2
    case "$TYPE-$GPG_SIGN" in
        deb-gpg)
            /release/dpkg-sig -k $GPGSIGNKEY --sign builder wallet-bridge_${VERSION}_${ARCH}.deb
            ;;
        rpm-gpg)
            rpm --addsign -D "%_gpg_name $GPGSIGNKEY" wallet-bridge-${VERSION}-1.${ARCH}.rpm
            ;;
    esac
done

rm -rf ./usr ./lib
