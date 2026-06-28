# Publishing to npm

TeczFlow is published under the **@mytecz** scope (your npm account).

## Packages

| Package | Install | Binary |
|---------|---------|--------|
| `@mytecz/teczflow-core` | Library | — |
| `@mytecz/teczflow-cli` | CLI | `teczflow` |
| `@mytecz/teczflow-mcp-server` | MCP server | `teczflow-mcp` |

## First-time publish

1. Login (done):
   ```bash
   npm login
   npm whoami   # should show: mytecz
   ```

2. Build and test:
   ```bash
   npm run build
   npm test
   ```

3. Publish **in order** (core first). npm requires **2FA OTP** if enabled on your account:
   ```bash
   npm publish -w @mytecz/teczflow-core --access public --otp=YOUR_6_DIGIT_CODE
   npm publish -w @mytecz/teczflow-mcp-server --access public --otp=YOUR_6_DIGIT_CODE
   npm publish -w @mytecz/teczflow-cli --access public --otp=YOUR_6_DIGIT_CODE
   ```

   Or use the root script after entering OTP:
   ```bash
   npm run publish:packages -- --otp=YOUR_6_DIGIT_CODE
   ```

## After publish — user install

**CLI:**
```bash
npm install -g @mytecz/teczflow-cli
teczflow load ./my-api.yaml
teczflow workflow "checkout"
```

**MCP (Claude Desktop):**
```json
{
  "mcpServers": {
    "teczflow": {
      "command": "npx",
      "args": ["-y", "@mytecz/teczflow-mcp-server"]
    }
  }
}
```

## Alternative: Granular access token

1. npm → Account → **Access Tokens** → Generate **Granular Access Token**
2. Enable **Publish** permission and **Bypass 2FA** (if available)
3. Login with token or set `//registry.npmjs.org/:_authToken=TOKEN`

## Version bumps

Before each release:
```bash
npm version patch -w @mytecz/teczflow-core
npm version patch -w @mytecz/teczflow-mcp-server
npm version patch -w @mytecz/teczflow-cli
```

Keep `@mytecz/teczflow-core` version in sync with dependent packages.

## Optional: @teczflow org

To use `@teczflow/*` instead of `@mytecz/*`:
1. Create org at https://www.npmjs.com/org/create (name: `teczflow`)
2. Rename packages in `package.json` files
3. Republish
