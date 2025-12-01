# =============================================================================
# Makefile - Common development commands for Android Agent Spark
# =============================================================================
# Quick reference:
#   make install     - Install all dependencies
#   make dev         - Start development servers (web + server)
#   make build       - Build all projects
#   make test        - Run all tests
#   make lint        - Run linting
#   make clean       - Remove build artifacts
# =============================================================================

.PHONY: install dev build test lint clean help docker-up docker-down

# Default target
help:
	@echo "Android Agent Spark - Available commands:"
	@echo ""
	@echo "  make install       Install all dependencies"
	@echo "  make dev           Start development servers (web + server)"
	@echo "  make dev-frontend  Start the main frontend app"
	@echo "  make dev-web       Start the secondary web app"
	@echo "  make dev-server    Start the Node.js API server"
	@echo "  make dev-backend   Start the Python backend"
	@echo "  make build         Build all projects"
	@echo "  make test          Run all tests"
	@echo "  make lint          Run linting"
	@echo "  make typecheck     Run TypeScript type checking"
	@echo "  make validate      Run lint, typecheck, and tests"
	@echo "  make clean         Remove build artifacts"
	@echo "  make docker-up     Start Docker containers"
	@echo "  make docker-down   Stop Docker containers"
	@echo ""

# Installation
install:
	npm run install:all

# Development
dev:
	npm run dev

dev-frontend:
	npm run dev:frontend

dev-web:
	npm run dev:web

dev-server:
	npm run dev:server

dev-backend:
	npm run dev:backend

# Build
build:
	npm run build

build-frontend:
	npm run build:frontend

build-web:
	npm run build:web

build-server:
	npm run build:server

build-mobile:
	npm run build:mobile

build-desktop:
	npm run build:desktop

# Testing
test:
	npm test

test-frontend:
	npm run test:frontend

test-web:
	npm run test:web

test-server:
	npm run test:server

test-e2e:
	npm run test:e2e

# Code Quality
lint:
	npm run lint

typecheck:
	npm run typecheck

validate:
	npm run validate

# Docker
docker-up:
	docker-compose up --build

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Cleanup
clean:
	rm -rf node_modules
	rm -rf apps/frontend/node_modules
	rm -rf web/node_modules
	rm -rf server/node_modules
	rm -rf web/dist
	rm -rf apps/frontend/dist
	rm -rf dist

# Python backend setup
python-setup:
	cd scripts/python && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt

python-test:
	cd scripts/python && pytest
