# Future Work

This document captures deferred improvements and tasks that require human intent or design decisions. These are not bugs but rather enhancements that would benefit from thoughtful consideration.

## Code Quality

### TypeScript Improvements

- [ ] Review and eliminate `@typescript-eslint/no-explicit-any` warnings by adding proper type definitions
- [ ] Clean up unused variable warnings in a systematic review (some may be intentional for future use)
- [ ] Address React Hook dependency warnings in `use-agents.tsx`, `use-workflow-triggers.ts`, and `use-workflows.tsx`

### Testing Enhancements

- [ ] Add comprehensive unit tests for server components (currently using pattern that doesn't match existing tests)
- [ ] Add integration tests for workflow engine
- [ ] Add end-to-end tests for critical user journeys
- [ ] Achieve meaningful test coverage metrics (not arbitrary 100% mandates)

## Architecture Considerations

### Component Organization

- [ ] Consider extracting React contexts to separate files (per `react-refresh/only-export-components` warnings)
- [ ] Review the shared components strategy between `apps/frontend` and `web`

### Performance

- [ ] Profile and optimize useMemo dependencies that may cause unnecessary re-renders
- [ ] Investigate and address the `react-hooks/exhaustive-deps` warnings properly

## Developer Experience

### Documentation

- [ ] Add API documentation for the Node.js server endpoints
- [ ] Add API documentation for the Python backend
- [ ] Create architectural decision records (ADRs) for key design choices
- [ ] Add Storybook for UI component documentation

### Tooling

- [ ] Add Prettier configuration for consistent code formatting across the project
- [ ] Consider upgrading ESLint to v9 (current v8 is deprecated)
- [ ] Add pre-commit hooks for linting and formatting

## Security

### Dependency Updates

- [ ] Address npm audit vulnerabilities in workspaces
- [ ] Set up automated security scanning schedule
- [ ] Document security remediation patterns

## Infrastructure

### Build & Deploy

- [ ] Add production deployment workflow
- [ ] Configure environment-specific builds
- [ ] Add mobile and desktop build automation to CI

---

*This document should be reviewed periodically and items should be moved to GitHub Issues when they are ready to be worked on.*
