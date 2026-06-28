import { useEffect, useState } from 'react';

interface ApiSummary {
  apiId: string;
  name: string;
  endpointCount: number;
  tags: string[];
}

interface SearchResult {
  nodeId: string;
  type: string;
  label: string;
  score: number;
  snippet: string;
}

interface WorkflowStep {
  order: number;
  method: string;
  path: string;
  label: string;
}

const API_BASE = '/api';

export default function App() {
  const [apis, setApis] = useState<ApiSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);
  const [graph, setGraph] = useState<{ nodes: Array<{ type: string; label: string }>; edges: Array<{ source: string; target: string; type: string }> } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/apis`).then((r) => r.json()).then(setApis).catch(() => setApis([]));
    fetch(`${API_BASE}/workflow?goal=checkout`).then((r) => r.json()).then((d) => setWorkflow(d.steps ?? [])).catch(() => {});
    fetch(`${API_BASE}/graph?api=ShopFlow`).then((r) => r.json()).then(setGraph).catch(() => null);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
    setSearchResults(await res.json());
  };

  return (
    <div className="app">
      <header>
        <h1>TeczFlow Dashboard</h1>
        <p>AI API Intelligence Platform by MyTecz</p>
      </header>

      <div className="search-box">
        <input
          placeholder='Search APIs e.g. "refund flow", "invoice APIs"'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="grid">
        <div className="panel">
          <h2>APIs</h2>
          <ul className="list">
            {apis.map((api) => (
              <li key={api.apiId}>
                <strong>{api.name}</strong>
                <br />
                <span className="badge">{api.endpointCount} endpoints</span>
                {api.tags.slice(0, 3).map((t) => (
                  <span key={t} className="badge">{t}</span>
                ))}
              </li>
            ))}
            {apis.length === 0 && <li>Start API server: npm run ui:api</li>}
          </ul>
        </div>

        <div className="panel">
          <h2>Search Results</h2>
          <ul className="list">
            {searchResults.map((r) => (
              <li key={r.nodeId}>
                <span className="badge">{r.type}</span>
                {r.label}
                <br />
                <small>{r.snippet}</small>
              </li>
            ))}
            {searchResults.length === 0 && <li>Enter a query to search</li>}
          </ul>
        </div>

        <div className="panel">
          <h2>Checkout Workflow</h2>
          {workflow.map((step) => (
            <div key={step.order} className="workflow-step">
              <span className="step-num">{step.order}</span>
              <span>{step.method} {step.path}</span>
            </div>
          ))}
          {workflow.length === 0 && <p>Load fixtures to see workflow</p>}
        </div>

        <div className="panel">
          <h2>Graph Preview</h2>
          {graph ? (
            <>
              <p>{graph.nodes.length} nodes, {graph.edges.length} edges</p>
              <ul className="list">
                {graph.edges.slice(0, 8).map((e, i) => (
                  <li key={i} className="graph-edge">{e.source.slice(0, 20)} → {e.type} → {e.target.slice(0, 20)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>Graph data unavailable</p>
          )}
        </div>
      </div>
    </div>
  );
}
