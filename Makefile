.PHONY: build test lint typecheck clean docker-build

build:
	npm run build

test:
	npm test

lint:
	npm run lint
	ruff check analysis/ || true

typecheck:
	npm run typecheck

clean:
	npm run clean

docker-build:
	bash docker/build.sh

all: lint typecheck test build
