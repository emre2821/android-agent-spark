# Agent Spark Frontend

The main React/TypeScript frontend application for Agent Spark.

## Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Radix UI** - Accessible component primitives
- **React Router** - Client-side routing
- **React Query** - Server state management

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Run E2E tests
npm run test:e2e
```

## Directory Structure

```
src/
├── components/    # Reusable UI components
├── pages/         # Page components (routes)
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and API clients
├── types/         # TypeScript type definitions
├── config/        # Configuration files
├── utils/         # Helper utilities
└── __tests__/     # Unit tests
```

## Configuration Files

- `vite.config.ts` - Vite bundler configuration
- `vitest.config.ts` - Unit test configuration
- `tailwind.config.ts` - TailwindCSS configuration
- `tsconfig.json` - TypeScript configuration
- `cypress.config.ts` - E2E test configuration
