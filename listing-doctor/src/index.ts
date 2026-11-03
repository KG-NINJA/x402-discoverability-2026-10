import type { Env, CheckRequest, CheckResult } from './types';
import { checkUrl } from './checker';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function build402Response(env: Env): Response {
  const price = parseFloat(env.PAYWALL_PRICE_USDC);
  const amount = Math.round(price * 1_000_000).toString();

  const paymentRequired = {
    accepts: [
      {
        scheme: 'exact',
        network: env.PAYWALL_NETWORK,
        asset: env.PAYWALL_ASSET,
        payTo: env.PAYWALL_PAY_TO,
        amount,
        description: 'x402 Listing Doctor - Single URL discoverability check',
        outputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            host: { type: 'string' },
            score: { type: 'number' },
            maxScore: { type: 'number' },
            percentile: { type: 'string' },
            confirmed: { type: 'array' },
            couldNotConfirm: { type: 'array' },
            fixes: { type: 'array' },
            checkedAt: { type: 'string' },
          },
        },
      },
    ],
    resource: {
      description:
        'Check whether an x402 paid endpoint is discoverable and properly configured, using the same 9-signal scoring criteria from the 2026-10-26 survey of 2,735 hosts.',
    },
    extensions: {
      bazaar: {
        info: {
          input: {
            method: 'POST',
            body: { url: 'https://example.com/paid-endpoint' },
          },
          output: {
            type: 'CheckResult',
            description: 'Discoverability score, confirmed signals, fixes, and notes',
          },
        },
      },
    },
  };

  const paymentRequiredBase64 = btoa(JSON.stringify(paymentRequired));

  return new Response(JSON.stringify(paymentRequired, null, 2), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'Payment-Required': paymentRequiredBase64,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Payment',
        },
      });
    }

    if (url.pathname === '/check' && request.method === 'POST') {
      const paywallEnabled = env.PAYWALL_ENABLED === 'true';

      if (paywallEnabled) {
        const paymentHeader = request.headers.get('X-Payment');
        if (!paymentHeader) {
          return build402Response(env);
        }
      }

      let body: CheckRequest;
      try {
        body = (await request.json()) as CheckRequest;
      } catch {
        return errorResponse('Invalid JSON body', 400);
      }

      if (!body.url || typeof body.url !== 'string') {
        return errorResponse('Missing or invalid "url" field', 400);
      }

      try {
        new URL(body.url);
      } catch {
        return errorResponse('Invalid URL format', 400);
      }

      if (!body.url.startsWith('https://')) {
        return errorResponse('Only HTTPS URLs are supported', 400);
      }

      try {
        const result: CheckResult = await checkUrl(body.url, fetch);
        return jsonResponse(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return errorResponse(`Check failed: ${message}`, 500);
      }
    }

    if (url.pathname === '/' || url.pathname === '') {
      return jsonResponse({
        service: 'x402 Listing Doctor',
        version: '0.1.0',
        description: {
          en: 'Single-URL checker for x402 endpoint discoverability, using the 9-signal scoring from the 2026-10-26 survey.',
          ja: 'x402エンドポイントの発見可能性をチェックする単一URLチェッカー（2026-10-26調査の9シグナルスコアリングを使用）',
        },
        endpoints: {
          'POST /check': {
            description: 'Check a single x402 endpoint URL',
            body: { url: 'https://example.com/paid-endpoint' },
          },
        },
        scoring: {
          maxScore: 7,
          note: 'MCP Registry and x402scan listing checks require external data and are reported as unverified in single-URL mode',
        },
        source: 'https://github.com/KG-NINJA/x402-discoverability-survey',
      });
    }

    return errorResponse('Not found', 404);
  },
};
