# Publishing to npm

TeczFlow is published under the **@mytecz** scope (your npm account).

## Packages

| Package | Install | Binary |
|---------|---------|--------|
| `@mytecz/teczflow-core` | Library | — |
| `@mytecz/teczflow-cli` | CLI | `teczflow` |
| `@mytecz/teczflow-mcp-server` | MCP server | `teczflow-mcp` |

## Create the correct npm token (required for 2FA accounts)

Your npm account has **2FA enabled**. A normal token is not enough — you need a **Granular Access Token** with publish + bypass 2FA.

1. Go to https://www.npmjs.com/settings/mytecz/tokens/granular-access-tokens/new
2. Set:
   - **Token name:** `teczflow-publish`
   - **Expiration:** 90 days (or your preference)
   - **Packages and scopes:** Read and Write — select `@mytecz/*` or all packages
   - **Organizations:** (none unless applicable)
3. **Important:** Enable **“Bypass two-factor authentication for automation”**
4. Generate and copy the token (starts with `npm_`)
5. **Never paste tokens in chat** — add directly to GitHub Secrets

### Add to GitHub (for Actions)

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|-------|
| `NPM_TOKEN` | your granular token |

Then run: **Actions → Publish to npm → Run workflow**

### Publish locally with token

```bash
# PowerShell — do NOT save token in files
$env:NODE_AUTH_TOKEN="npm_YOUR_TOKEN_HERE"
npm publish -w @mytecz/teczflow-core --access public
npm publish -w @mytecz/teczflow-mcp-server --access public
npm publish -w @mytecz/teczflow-cli --access public
```

### Or publish with OTP (one-time code from authenticator)

```bash
npm publish -w @mytecz/teczflow-core --access public --otp=123456
```

## Publish via GitHub Actions (recommended)

1. Create an npm **Granular Access Token** with **Publish** permission at https://www.npmjs.com/settings/mytecz/tokens
2. Add it to GitHub: **Repo → Settings → Secrets → Actions → `NPM_TOKEN`**
3. Run workflow: **Actions → Publish to npm → Run workflow**

Or create a GitHub Release to trigger publish automatically.

## First-time publish (local with 2FA)

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
