#!/bin/sh

# Install dependencies
npm install

# Start the mock API server (in a separate terminal)
# npm run server

# Launch the development server
# npm run dev

# --- Testing ---

# Run component and integration tests
npm test

# Run end-to-end tests with Cypress
npm run test:e2e

# Check for code quality and style issues (linting)
npm run lint

# Perform a TypeScript validation pass
npm run typecheck

# Run a combination of linting, type checking, and tests
npm run validate
