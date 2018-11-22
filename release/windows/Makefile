PLATFORM  = win
BITS      = 64
NAME64 = wallet-bridge-win64.exe
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
	npm run build:windows
	mv -f ../../build/$(NAME64) build/walletd-64b.exe
	cp ../../VERSION build

.package: .binary .docker-image
	$(info Packaging ...)
	docker run -i -t $(VOL_MOUNT) $(IMAGETAG) /release/release.sh $(PLATFORM)$(BITS)

.docker-image: Dockerfile
	$(info Preparing docker image ...)
	docker build -t $(IMAGETAG) .

shell: .docker-image
	docker run -i -t $(VOL_MOUNT) $(IMAGETAG) /bin/bash