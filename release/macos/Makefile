PLATFORM  = macos
BITS      = 64
NAME64 = wallet-bridge-macos64
VOL_MOUNT = -v $(shell pwd):/release
IMAGETAG  = walletd-nodejs-build-env-$(PLATFORM)

all: clean .package

clean:
	$(info Cleaning...)
	rm -rf build

.binary:
	$(info Building with xgo ...)
	mkdir -p build
	npm run build:node
	npm run build:macos
	mv -f ../../build/$(NAME64) build/walletd
	cp ../../VERSION build

.package: .binary .docker-image
	$(info Packaging ...)
	docker run -i -t $(VOL_MOUNT) $(IMAGETAG) /release/release.sh $(PLATFORM)$(BITS)

.docker-image:
	$(info Preparing docker image ...)
	docker build -t $(IMAGETAG) .

shell: .docker-image
	docker run -i -t $(VOL_MOUNT) $(IMAGETAG) /bin/bash
