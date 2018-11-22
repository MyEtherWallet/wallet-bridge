getent group walletd >/dev/null || groupadd -r walletd
getent group plugdev >/dev/null || groupadd -r plugdev
getent passwd walletd >/dev/null || useradd -r -g wallet -d /var -s /bin/false -c "Wallet Bridge" walletd
usermod -a -G plugdev walletd
touch /var/log/walletd.log
chown walletd:walletd /var/log/walletd.log
chmod 660 /var/log/walletd.log
