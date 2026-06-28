# Contributing to TeczFlow

Thank you for contributing to TeczFlow!

## Development Setup

```bash
git clone https://github.com/mytecz/teczflow.git
cd teczflow
npm install
npm run build
npm test
```

## Project Structure

```
packages/core/       — Graph, reasoning, adapters, services
packages/mcp-server/ — MCP server
packages/cli/        — CLI
ui/                  — Dashboard
fixtures/            — Sample data
docs/                — User documentation
```

## Adding an Adapter

1. Create `packages/core/src/adapters/my.adapter.ts`
2. Implement `SourceAdapter` or `TelemetryAdapter`
3. Register in `TeczFlowEngine` or `TelemetryRegistry`
4. Add tests in `packages/core/__tests__/`
5. Document in README and `docs/`

## Pull Request Checklist

- [ ] `npm run build` passes
- [ ] `npm test` passes (add tests for new behavior)
- [ ] Documentation updated if user-facing
- [ ] No secrets in commits

## Code Style

- TypeScript strict mode
- Match existing patterns in surrounding files
- Keep core free of MCP/cloud SDK dependencies

## License

By contributing, you agree your contributions will be licensed under MIT.
