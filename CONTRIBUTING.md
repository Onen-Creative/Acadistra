# Contributing to Acadistra

Thank you for your interest in contributing to Acadistra! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/acadistra.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit with clear messages
7. Push to your fork
8. Create a Pull Request

## Development Setup

### Backend (Go)
```bash
cd backend
go mod download
go run cmd/api/main.go
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## Code Style

### Go
- Follow standard Go conventions
- Use `gofmt` for formatting
- Run `go vet` before committing
- Add comments for exported functions

### TypeScript/React
- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Format with Prettier

## Testing

### Backend Tests
```bash
cd backend
go test ./... -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Commit Messages

Use clear, descriptive commit messages:
- `feat: Add student bulk import feature`
- `fix: Resolve attendance calculation bug`
- `docs: Update deployment guide`
- `refactor: Simplify grading logic`

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

## Feature Requests

Open an issue with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (optional)

## Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Screenshots if applicable

## Code Review

All submissions require review. We aim to:
- Respond within 48 hours
- Provide constructive feedback
- Merge approved PRs promptly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or reach out to the maintainers.

Thank you for contributing! 🎉
