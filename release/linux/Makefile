PLATFORM  = linux
VOL_MOUNT = -v $(shell pwd):/release
IMAGETAG  = wallet-bridge-nodejs-build-env-$(PLATFORM)

IMPORT_PATH = ../..

all: clean .package

clean:
	$(info Cleaning...)
	rm -rf build

.binary:
	$(info Building with xgo ...)
	mkdir -p build
	npm run build:node
	npm run build:linux
	mv -f ../../build/wallet-bridge-linux64 build/walletd-linux-amd64
	cp ../../VERSION build

.package: .binary .docker-image
	$(info Packaging ...)
	docker run -i -t $(VOL_MOUNT) $(IMAGETAG) /release/release.sh linux-amd64

.docker-image:
	$(info Preparing docker image ...)
	docker build -t $(IMAGETAG) .

shell: .docker-image
	docker run -i -t $(VOL_MOUNT) $(IMAGETAG) /bin/bash

privkey:
	gpg --armor --export-secret-key 7B9A12F0 > privkey.asc
