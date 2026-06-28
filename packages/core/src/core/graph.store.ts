import type { GraphSnapshot } from '../types/index.js';
import type { GraphStore } from '../types/index.js';

export class InMemoryGraphStore implements GraphStore {
  private store = new Map<string, GraphSnapshot>();

  async load(tenantId: string): Promise<GraphSnapshot | null> {
    const snapshot = this.store.get(tenantId);
    return snapshot ? structuredClone(snapshot) : null;
  }

  async save(tenantId: string, snapshot: GraphSnapshot): Promise<void> {
    this.store.set(tenantId, structuredClone(snapshot));
  }

  async delete(tenantId: string): Promise<void> {
    this.store.delete(tenantId);
  }

  has(tenantId: string): boolean {
    return this.store.has(tenantId);
  }
}
