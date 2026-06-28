import { createServer } from 'node:http';
import { TeczFlowEngine } from '@mytecz/teczflow-core';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const PORT = 3847;
const configPath = resolve(process.cwd(), 'config.json');

async function main() {
  const engine = new TeczFlowEngine(configPath);
  const fixtures = [
    { path: resolve(process.cwd(), 'fixtures/shopflow.openapi.yaml'), format: 'openapi' },
    { path: resolve(process.cwd(), 'fixtures/shopflow.postman.json'), format: 'postman' }
  ];
  for (const f of fixtures) {
    if (existsSync(f.path)) {
      try {
        await engine.load({ type: 'file', path: f.path, format: f.format });
      } catch {
        /* ignore */
      }
    }
  }
  await engine.refreshTelemetry();

  createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const svc = engine.getServices();

    try {
      if (url.pathname === '/api/apis') {
        res.end(JSON.stringify(svc.discovery.listApis()));
      } else if (url.pathname === '/api/search') {
        res.end(JSON.stringify(svc.search.search(url.searchParams.get('q') ?? '')));
      } else if (url.pathname === '/api/workflow') {
        const result = svc.workflow.infer(url.searchParams.get('goal') ?? 'checkout');
        res.end(JSON.stringify(result));
      } else if (url.pathname === '/api/graph') {
        res.end(JSON.stringify(svc.graphService.getApiGraph(url.searchParams.get('api') ?? 'ShopFlow')));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err) }));
    }
  }).listen(PORT, () => {
    console.log(`TeczFlow UI API running on http://localhost:${PORT}`);
  });
}

main();
