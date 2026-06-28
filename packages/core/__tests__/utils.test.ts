import { describe, it, expect } from 'vitest';
import { parseErrorDescription } from '@mytecz/teczflow-core';

describe('parseErrorDescription', () => {
  it('parses method path and status', () => {
    const result = parseErrorDescription('POST /order failed 400');
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/order');
    expect(result.status).toBe(400);
  });
});
