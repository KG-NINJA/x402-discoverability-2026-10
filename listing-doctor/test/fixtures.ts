export interface MockResponse {
  status: number;
  body: string;
  headers?: Record<string, string>;
}

export type MockResponses = Record<string, MockResponse>;

export function createMockFetch(responses: MockResponses) {
  return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.url;

    for (const [pattern, mockResp] of Object.entries(responses)) {
      if (url.includes(pattern) || url.endsWith(pattern)) {
        return new Response(mockResp.body, {
          status: mockResp.status,
          headers: mockResp.headers,
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  };
}

export const GOOD_LLMS_TXT = `# Agent API Service

This service provides paid AI agent capabilities via x402 protocol.

## Endpoints
- /api/generate - Text generation endpoint
- /api/analyze - Data analysis endpoint

## Pricing
All endpoints are priced at 0.01 USDC per call.

## Contact
support@example.com
`;

export const GOOD_AGENT_CARD = JSON.stringify({
  name: 'Example Agent',
  description: 'A test agent for x402 payments',
  skills: ['text-generation', 'analysis'],
  url: 'https://example.com/api',
  version: '1.0.0',
});

export const GOOD_X402_WELLKNOWN = JSON.stringify({
  version: '2',
  endpoints: [
    {
      path: '/api/generate',
      method: 'POST',
      price: '0.01',
      currency: 'USDC',
    },
  ],
});

export const GOOD_ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
`;

export const GOOD_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
  </url>
  <url>
    <loc>https://example.com/api/generate</loc>
  </url>
</urlset>
`;

export const GOOD_402_RESPONSE = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'base-mainnet',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '10000',
      description: 'AI text generation - 0.01 USDC per call',
      outputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
      },
    },
  ],
  resource: {
    description: 'Generate text using AI models',
  },
  extensions: {
    bazaar: {
      info: {
        input: {
          method: 'POST',
          body: { prompt: 'string' },
        },
        output: {
          type: 'object',
          properties: { text: { type: 'string' } },
        },
      },
    },
  },
});

export const VERIFICATION_PAGE = `<!DOCTYPE html>
<html>
<head><title>Verification Results</title></head>
<body>
<h1>Service Verification Results</h1>
<p>Last test run: 2026-10-20</p>
<h2>Self-purchase proof</h2>
<p>Transaction hash: 0xabc123...</p>
<p>All endpoints verified working correctly.</p>
<p>Test results show 100% success rate over 1000 calls.</p>
</body>
</html>
`;

export const GOOD_ENDPOINT_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402.json': { status: 200, body: GOOD_X402_WELLKNOWN },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/generate': { status: 402, body: GOOD_402_RESPONSE },
  '/verification-results': { status: 200, body: VERIFICATION_PAGE },
};

export const NOT_FOUND_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 404, body: 'Not Found' },
  '/.well-known/agent-card.json': { status: 404, body: 'Not Found' },
  '/.well-known/agent.json': { status: 404, body: 'Not Found' },
  '/.well-known/x402': { status: 404, body: 'Not Found' },
  '/.well-known/x402.json': { status: 404, body: 'Not Found' },
  '/robots.txt': { status: 404, body: 'Not Found' },
  '/sitemap.xml': { status: 404, body: 'Not Found' },
  '/api/endpoint': { status: 404, body: 'Not Found' },
  '/verification-results': { status: 404, body: 'Not Found' },
  '/verification': { status: 404, body: 'Not Found' },
  '/test-results': { status: 404, body: 'Not Found' },
  '/.well-known/verification.json': { status: 404, body: 'Not Found' },
};

export const MISSING_SCHEMA_402_RESPONSE = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'base-mainnet',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '10000',
      description: 'AI text generation',
    },
  ],
});

export const MISSING_SCHEMA_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402.json': { status: 200, body: GOOD_X402_WELLKNOWN },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/generate': { status: 402, body: MISSING_SCHEMA_402_RESPONSE },
  '/verification-results': { status: 404, body: 'Not Found' },
  '/verification': { status: 404, body: 'Not Found' },
  '/test-results': { status: 404, body: 'Not Found' },
  '/.well-known/verification.json': { status: 404, body: 'Not Found' },
};

export const PRICE_MISMATCH_402_RESPONSE = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'base-mainnet',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '999999999',
      outputSchema: { type: 'object' },
    },
  ],
  resource: {
    description: 'Expensive endpoint',
  },
  extensions: {
    bazaar: {
      info: {
        output: { type: 'object' },
      },
    },
  },
});

export const PRICE_MISMATCH_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402.json': {
    status: 200,
    body: JSON.stringify({
      version: '2',
      endpoints: [{ path: '/api/generate', price: '0.01', currency: 'USDC' }],
    }),
  },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/generate': { status: 402, body: PRICE_MISMATCH_402_RESPONSE },
  '/verification-results': { status: 404, body: 'Not Found' },
  '/verification': { status: 404, body: 'Not Found' },
  '/test-results': { status: 404, body: 'Not Found' },
  '/.well-known/verification.json': { status: 404, body: 'Not Found' },
};
