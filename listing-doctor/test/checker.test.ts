import { describe, it, expect } from 'vitest';
import { checkUrl } from '../src/checker';
import {
  createMockFetch,
  GOOD_ENDPOINT_RESPONSES,
  NOT_FOUND_RESPONSES,
  MISSING_SCHEMA_RESPONSES,
  MISSING_BOTH_SCHEMAS_RESPONSES,
  PRICE_MISMATCH_RESPONSES,
  INVALID_NETWORK_402,
  INVALID_ADDRESS_402,
} from './fixtures';

describe('checkUrl', () => {
  describe('good x402 endpoint', () => {
    it('should score 7/7 for a fully compliant endpoint', async () => {
      const mockFetch = createMockFetch(GOOD_ENDPOINT_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      expect(result.score).toBe(7);
      expect(result.maxScore).toBe(7);
      expect(result.host).toBe('example.com');

      const confirmedSignals = result.confirmed.filter((c) => c.detected);
      expect(confirmedSignals.map((c) => c.signal)).toEqual([
        'llms_txt',
        'a2a_card',
        'x402_wellknown',
        'robots_txt',
        'sitemap_xml',
        'live402_metadata',
        'verification_page_heuristic',
      ]);

      expect(result.couldNotConfirm).toHaveLength(2);
      expect(result.couldNotConfirm.map((u) => u.signal)).toEqual([
        'mcp_registry',
        'x402scan_listed',
      ]);

      expect(result.x402Validation).toBeDefined();
      expect(result.x402Validation?.hasAcceptsArray).toBe(true);
      expect(result.x402Validation?.hasInputSchema).toBe(true);
      expect(result.x402Validation?.hasOutputSchema).toBe(true);
      expect(result.x402Validation?.networkValid).toBe(true);
      expect(result.x402Validation?.assetValid).toBe(true);
      expect(result.x402Validation?.payToValid).toBe(true);
    });
  });

  describe('404 endpoint', () => {
    it('should score 0/7 for a non-existent endpoint', async () => {
      const mockFetch = createMockFetch(NOT_FOUND_RESPONSES);
      const result = await checkUrl('https://example.com/api/endpoint', mockFetch);

      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(7);

      const confirmedSignals = result.confirmed.filter((c) => c.detected);
      expect(confirmedSignals).toHaveLength(0);

      expect(result.x402Validation?.httpStatus).toBe(404);
      expect(result.x402Validation?.issues).toContainEqual(
        expect.objectContaining({ code: 'NO_402_RESPONSE' })
      );
    });
  });

  describe('402 missing schema', () => {
    it('should fail live402_metadata when both schemas are missing', async () => {
      const mockFetch = createMockFetch(MISSING_BOTH_SCHEMAS_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      expect(result.score).toBe(5);

      const live402 = result.confirmed.find((c) => c.signal === 'live402_metadata');
      expect(live402?.detected).toBe(false);
      expect(live402?.details).toContain('missing');

      expect(result.x402Validation?.hasInputSchema).toBe(false);
      expect(result.x402Validation?.hasOutputSchema).toBe(false);
      expect(result.x402Validation?.issues).toContainEqual(
        expect.objectContaining({ code: 'MISSING_INPUT_SCHEMA', severity: 'high' })
      );
      expect(result.x402Validation?.issues).toContainEqual(
        expect.objectContaining({ code: 'MISSING_OUTPUT_SCHEMA', severity: 'high' })
      );
    });

    it('should report missing description', async () => {
      const mockFetch = createMockFetch(MISSING_BOTH_SCHEMAS_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      expect(result.x402Validation?.hasDescription).toBe(false);
      expect(result.x402Validation?.issues).toContainEqual(
        expect.objectContaining({ code: 'MISSING_DESCRIPTION', severity: 'medium' })
      );
    });

    it('should include high-priority fixes for missing schemas', async () => {
      const mockFetch = createMockFetch(MISSING_BOTH_SCHEMAS_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      const schemaFixes = result.fixes.filter(
        (f) =>
          f.signal.includes('402_validation') ||
          f.en.toLowerCase().includes('schema') ||
          f.signal === 'live402_metadata'
      );
      expect(schemaFixes.length).toBeGreaterThan(0);

      for (const fix of schemaFixes) {
        expect(fix.en).toBeTruthy();
        expect(fix.ja).toBeTruthy();
      }
    });
  });

  describe('price mismatch detection', () => {
    it('should detect price mismatch between 402 and advertised values', async () => {
      const mockFetch = createMockFetch(PRICE_MISMATCH_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      expect(result.x402Validation?.priceConsistency.checked).toBe(true);
      expect(result.x402Validation?.priceConsistency.consistent).toBe(false);
      expect(result.x402Validation?.priceConsistency.details).toBeTruthy();
      expect(result.x402Validation?.priceConsistency.details).toContain('402 shows');

      const priceMismatchIssue = result.x402Validation?.issues.find(
        (i) => i.code === 'PRICE_MISMATCH'
      );
      expect(priceMismatchIssue).toBeDefined();
      expect(priceMismatchIssue?.severity).toBe('medium');
    });

    it('should pass live402_metadata even with price mismatch if schema present', async () => {
      const mockFetch = createMockFetch(PRICE_MISMATCH_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      const live402 = result.confirmed.find((c) => c.signal === 'live402_metadata');
      expect(live402?.detected).toBe(true);

      expect(result.score).toBe(6);
    });
  });

  describe('402 validity checks', () => {
    it('should detect invalid network identifier', async () => {
      const mockFetch = createMockFetch({
        '/__x402_census_404_probe_7f3a': { status: 404, body: '' },
        '/api/test': { status: 402, body: INVALID_NETWORK_402 },
      });

      const result = await checkUrl('https://example.com/api/test', mockFetch);

      expect(result.x402Validation?.networkValid).toBe(false);
      expect(result.x402Validation?.issues).toContainEqual(
        expect.objectContaining({ code: 'UNKNOWN_NETWORK' })
      );
    });

    it('should detect invalid addresses', async () => {
      const mockFetch = createMockFetch({
        '/__x402_census_404_probe_7f3a': { status: 404, body: '' },
        '/api/test': { status: 402, body: INVALID_ADDRESS_402 },
      });

      const result = await checkUrl('https://example.com/api/test', mockFetch);

      expect(result.x402Validation?.assetValid).toBe(false);
      expect(result.x402Validation?.payToValid).toBe(false);
      expect(result.x402Validation?.issues).toContainEqual(
        expect.objectContaining({ code: 'INVALID_ASSET_ADDRESS', severity: 'high' })
      );
      expect(result.x402Validation?.issues).toContainEqual(
        expect.objectContaining({ code: 'INVALID_PAYTO_ADDRESS', severity: 'high' })
      );
    });
  });

  describe('output format', () => {
    it('should include bilingual notes and fix messages', async () => {
      const mockFetch = createMockFetch(NOT_FOUND_RESPONSES);
      const result = await checkUrl('https://example.com/api/endpoint', mockFetch);

      expect(result.note.en).toBeTruthy();
      expect(result.note.ja).toBeTruthy();

      for (const fix of result.fixes) {
        expect(fix.en).toBeTruthy();
        expect(fix.ja).toBeTruthy();
      }
    });

    it('should include bilingual validation issues', async () => {
      const mockFetch = createMockFetch(MISSING_BOTH_SCHEMAS_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      for (const issue of result.x402Validation?.issues || []) {
        expect(issue.en).toBeTruthy();
        expect(issue.ja).toBeTruthy();
      }
    });

    it('should include checkedAt timestamp', async () => {
      const mockFetch = createMockFetch(GOOD_ENDPOINT_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include percentile based on survey data', async () => {
      const mockFetch = createMockFetch(GOOD_ENDPOINT_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      expect(result.percentile).toContain('top');
      expect(result.percentile).toContain('2735');
    });
  });

  describe('couldNotConfirm signals', () => {
    it('should always include mcp_registry and x402scan_listed as unverified', async () => {
      const mockFetch = createMockFetch(GOOD_ENDPOINT_RESPONSES);
      const result = await checkUrl('https://example.com/api/generate', mockFetch);

      const unverified = result.couldNotConfirm;
      expect(unverified).toHaveLength(2);

      const mcpRegistry = unverified.find((u) => u.signal === 'mcp_registry');
      expect(mcpRegistry?.reason.en).toContain('MCP Registry');
      expect(mcpRegistry?.reason.ja).toContain('MCPレジストリ');

      const x402scan = unverified.find((u) => u.signal === 'x402scan_listed');
      expect(x402scan?.reason.en).toContain('x402scan');
      expect(x402scan?.reason.ja).toContain('x402scan');
    });
  });
});

describe('individual signal checks', () => {
  it('should detect llms.txt correctly', async () => {
    const mockFetch = createMockFetch({
      '/__x402_census_404_probe_7f3a': { status: 404, body: '' },
      '/llms.txt': {
        status: 200,
        body: 'This is a valid llms.txt file with more than fifty characters of content.',
      },
      '/api/test': { status: 404, body: '' },
    });

    const result = await checkUrl('https://example.com/api/test', mockFetch);
    const llms = result.confirmed.find((c) => c.signal === 'llms_txt');
    expect(llms?.detected).toBe(true);
  });

  it('should reject short llms.txt', async () => {
    const mockFetch = createMockFetch({
      '/__x402_census_404_probe_7f3a': { status: 404, body: '' },
      '/llms.txt': { status: 200, body: 'Too short' },
      '/api/test': { status: 404, body: '' },
    });

    const result = await checkUrl('https://example.com/api/test', mockFetch);
    const llms = result.confirmed.find((c) => c.signal === 'llms_txt');
    expect(llms?.detected).toBe(false);
    expect(llms?.details).toContain('too short');
  });

  it('should detect soft-404 pages', async () => {
    const soft404Content = 'Page not found - custom 404 page';
    const mockFetch = createMockFetch({
      '/__x402_census_404_probe_7f3a': { status: 200, body: soft404Content },
      '/llms.txt': { status: 200, body: soft404Content },
      '/api/test': { status: 404, body: '' },
    });

    const result = await checkUrl('https://example.com/api/test', mockFetch);
    const llms = result.confirmed.find((c) => c.signal === 'llms_txt');
    expect(llms?.detected).toBe(false);
    expect(llms?.details).toContain('soft-404');
  });
});
