export interface MockResponse {
  status: number;
  body: string;
  headers?: Record<string, string>;
  delay?: number;
  hangBody?: boolean;
}

export type MockResponses = Record<string, MockResponse>;

export function createMockFetch(responses: MockResponses) {
  return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const method = init?.method || 'GET';

    for (const [pattern, mockResp] of Object.entries(responses)) {
      const patternWithMethod = `${method}:${pattern}`;
      const urlMatches = url.includes(pattern) || url.endsWith(pattern);
      const methodPatternKey = Object.keys(responses).find(
        (k) => k === patternWithMethod || k.startsWith(`${method}:`) && url.includes(k.slice(method.length + 1))
      );

      if (methodPatternKey && responses[methodPatternKey]) {
        const resp = responses[methodPatternKey];
        if (resp.delay) {
          await new Promise((r) => setTimeout(r, resp.delay));
        }
        if (resp.hangBody) {
          return new Response(
            new ReadableStream({
              start(controller) {
                // Never close - simulates hanging body
              },
            }),
            { status: resp.status, headers: resp.headers }
          );
        }
        return new Response(resp.body, {
          status: resp.status,
          headers: resp.headers,
        });
      }

      if (urlMatches) {
        if (mockResp.delay) {
          await new Promise((r) => setTimeout(r, mockResp.delay));
        }
        if (mockResp.hangBody) {
          return new Response(
            new ReadableStream({
              start(controller) {
                // Never close - simulates hanging body
              },
            }),
            { status: mockResp.status, headers: mockResp.headers }
          );
        }
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
  x402Version: 2,
  resources: [
    {
      resource: 'https://example.com/api/generate',
      method: 'GET',
      accepts: [
        {
          scheme: 'exact',
          network: 'eip155:8453',
          amount: '10000',
          asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          payTo: '0x1234567890abcdef1234567890abcdef12345678',
        },
      ],
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
      network: 'eip155:8453',
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
    resource: 'https://example.com/api/generate',
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
  '/.well-known/x402': { status: 200, body: GOOD_X402_WELLKNOWN },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/generate': { status: 402, body: GOOD_402_RESPONSE },
  '/verification-results': { status: 200, body: VERIFICATION_PAGE },
  '/SKILL.md': { status: 404, body: 'Not Found' },
  '/skill.md': { status: 404, body: 'Not Found' },
  '/.well-known/SKILL.md': { status: 404, body: 'Not Found' },
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
  '/SKILL.md': { status: 404, body: 'Not Found' },
  '/skill.md': { status: 404, body: 'Not Found' },
  '/.well-known/SKILL.md': { status: 404, body: 'Not Found' },
};

export const MISSING_SCHEMA_402_RESPONSE = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '10000',
      description: 'AI text generation - no schema provided',
    },
  ],
  resource: {
    description: 'Generate text using AI models',
  },
});

export const MISSING_SCHEMA_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402': { status: 200, body: GOOD_X402_WELLKNOWN },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/generate': { status: 402, body: MISSING_SCHEMA_402_RESPONSE },
  '/verification-results': { status: 404, body: 'Not Found' },
  '/verification': { status: 404, body: 'Not Found' },
  '/test-results': { status: 404, body: 'Not Found' },
  '/.well-known/verification.json': { status: 404, body: 'Not Found' },
  '/SKILL.md': { status: 404, body: 'Not Found' },
  '/skill.md': { status: 404, body: 'Not Found' },
  '/.well-known/SKILL.md': { status: 404, body: 'Not Found' },
};

export const MISSING_BOTH_SCHEMAS_402 = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '10000',
    },
  ],
});

export const MISSING_BOTH_SCHEMAS_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402': { status: 200, body: GOOD_X402_WELLKNOWN },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/generate': { status: 402, body: MISSING_BOTH_SCHEMAS_402 },
  '/verification-results': { status: 404, body: 'Not Found' },
  '/verification': { status: 404, body: 'Not Found' },
  '/test-results': { status: 404, body: 'Not Found' },
  '/.well-known/verification.json': { status: 404, body: 'Not Found' },
  '/SKILL.md': { status: 404, body: 'Not Found' },
  '/skill.md': { status: 404, body: 'Not Found' },
  '/.well-known/SKILL.md': { status: 404, body: 'Not Found' },
};

export const X402_WELLKNOWN_WITH_SPECIFIC_PRICE = JSON.stringify({
  x402Version: 2,
  resources: [
    {
      resource: 'https://example.com/api/generate',
      method: 'GET',
      accepts: [
        {
          scheme: 'exact',
          network: 'eip155:8453',
          amount: '10000',
          asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          payTo: '0x1234567890abcdef1234567890abcdef12345678',
        },
      ],
    },
  ],
});

export const PRICE_MISMATCH_402_RESPONSE = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '50000',
      description: 'Different price than advertised',
      outputSchema: { type: 'object' },
    },
  ],
  resource: {
    resource: 'https://example.com/api/generate',
    description: 'Expensive endpoint',
  },
  extensions: {
    bazaar: {
      info: {
        input: { type: 'object' },
        output: { type: 'object' },
      },
    },
  },
});

export const PRICE_MISMATCH_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402': { status: 200, body: X402_WELLKNOWN_WITH_SPECIFIC_PRICE },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/generate': { status: 402, body: PRICE_MISMATCH_402_RESPONSE },
  '/verification-results': { status: 404, body: 'Not Found' },
  '/verification': { status: 404, body: 'Not Found' },
  '/test-results': { status: 404, body: 'Not Found' },
  '/.well-known/verification.json': { status: 404, body: 'Not Found' },
  '/SKILL.md': { status: 404, body: 'Not Found' },
  '/skill.md': { status: 404, body: 'Not Found' },
  '/.well-known/SKILL.md': { status: 404, body: 'Not Found' },
};

export const INVALID_NETWORK_402 = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'invalid-network-xyz',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '10000',
      description: 'Invalid network',
      outputSchema: { type: 'object' },
    },
  ],
  resource: { description: 'Test' },
  extensions: { bazaar: { info: { input: {}, output: {} } } },
});

export const INVALID_ADDRESS_402 = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: 'not-a-valid-address',
      payTo: 'also-not-valid',
      amount: '10000',
      description: 'Invalid addresses',
      outputSchema: { type: 'object' },
    },
  ],
  resource: { description: 'Test' },
  extensions: { bazaar: { info: { input: {}, output: {} } } },
});

export const POST_ONLY_X402_WELLKNOWN = JSON.stringify({
  x402Version: 2,
  resources: [
    {
      resource: 'https://example.com/api/post-only',
      method: 'POST',
      accepts: [
        {
          scheme: 'exact',
          network: 'eip155:8453',
          amount: '10000',
          asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          payTo: '0x1234567890abcdef1234567890abcdef12345678',
        },
      ],
    },
  ],
});

export const POST_ONLY_402_RESPONSE = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '10000',
      description: 'POST-only endpoint',
      outputSchema: { type: 'object' },
    },
  ],
  resource: {
    resource: 'https://example.com/api/post-only',
    description: 'POST-only endpoint',
  },
  extensions: {
    bazaar: {
      info: {
        input: { type: 'object' },
        output: { type: 'object' },
      },
    },
  },
});

export const POST_ONLY_ENDPOINT_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402': { status: 200, body: POST_ONLY_X402_WELLKNOWN },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  'GET:/api/post-only': { status: 405, body: 'Method Not Allowed' },
  'POST:/api/post-only': { status: 402, body: POST_ONLY_402_RESPONSE },
  '/api/post-only': { status: 405, body: 'Method Not Allowed' },
  '/verification-results': { status: 404, body: 'Not Found' },
  '/SKILL.md': { status: 404, body: 'Not Found' },
  '/skill.md': { status: 404, body: 'Not Found' },
  '/.well-known/SKILL.md': { status: 404, body: 'Not Found' },
};

export const MALFORMED_ACCEPTS_402 = JSON.stringify({
  accepts: 'not-an-array',
  resource: { description: 'Test' },
  extensions: { bazaar: { info: { input: {}, output: {} } } },
});

export const MALFORMED_AMOUNT_402 = JSON.stringify({
  accepts: [
    {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      amount: { invalid: 'object' },
      description: 'Malformed amount',
      outputSchema: { type: 'object' },
    },
  ],
  resource: { description: 'Test' },
  extensions: { bazaar: { info: { input: {}, output: {} } } },
});

export const MALFORMED_DATA_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402': { status: 200, body: GOOD_X402_WELLKNOWN },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/malformed-accepts': { status: 402, body: MALFORMED_ACCEPTS_402 },
  '/api/malformed-amount': { status: 402, body: MALFORMED_AMOUNT_402 },
  '/api/non-json': { status: 402, body: 'This is not JSON at all' },
  '/verification-results': { status: 404, body: 'Not Found' },
  '/SKILL.md': { status: 404, body: 'Not Found' },
  '/skill.md': { status: 404, body: 'Not Found' },
  '/.well-known/SKILL.md': { status: 404, body: 'Not Found' },
};

export const DIFFERENT_RESOURCE_X402_WELLKNOWN = JSON.stringify({
  x402Version: 2,
  resources: [
    {
      resource: 'https://example.com/api/other-endpoint',
      method: 'GET',
      accepts: [
        {
          scheme: 'exact',
          network: 'eip155:8453',
          amount: '99999',
          asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          payTo: '0xDIFFERENT000000000000000000000000000000',
        },
      ],
    },
    {
      resource: 'https://example.com/api/generate',
      method: 'GET',
      accepts: [
        {
          scheme: 'exact',
          network: 'eip155:8453',
          amount: '10000',
          asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          payTo: '0x1234567890abcdef1234567890abcdef12345678',
        },
      ],
    },
  ],
});

export const NO_MISMATCH_DIFFERENT_RESOURCES_RESPONSES: MockResponses = {
  '/__x402_census_404_probe_7f3a': { status: 404, body: 'Not Found' },
  '/llms.txt': { status: 200, body: GOOD_LLMS_TXT },
  '/.well-known/agent-card.json': { status: 200, body: GOOD_AGENT_CARD },
  '/.well-known/x402': { status: 200, body: DIFFERENT_RESOURCE_X402_WELLKNOWN },
  '/robots.txt': { status: 200, body: GOOD_ROBOTS_TXT },
  '/sitemap.xml': { status: 200, body: GOOD_SITEMAP },
  '/api/generate': { status: 402, body: GOOD_402_RESPONSE },
  '/verification-results': { status: 200, body: VERIFICATION_PAGE },
  '/SKILL.md': { status: 404, body: 'Not Found' },
  '/skill.md': { status: 404, body: 'Not Found' },
  '/.well-known/SKILL.md': { status: 404, body: 'Not Found' },
};
