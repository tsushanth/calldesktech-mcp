/**
 * Mock CallDeskTech API server for E2E testing.
 * Only real documented endpoints. Tracks every request.
 */
import http from 'http';

export function startMockApi(port = 9876) {
  const requests = [];

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const parsedBody = body ? JSON.parse(body) : undefined;
      requests.push({ method: req.method, url: req.url, path: req.url.split('?')[0], body: parsedBody, headers: req.headers });

      res.setHeader('Content-Type', 'application/json');

      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const { method, url } = req;
      const route = `${method} ${url.split('?')[0]}`;

      if (route === 'GET /api/v1/me') {
        res.writeHead(200);
        res.end(JSON.stringify({ tenantId: 'test-tenant-123', name: 'Test Workspace', email: 'test@example.com' }));
        return;
      }

      const tp = `/api/v1/tenants/test-tenant-123`;

      // agents
      if (route === `GET ${tp}/agents`) { res.writeHead(200); res.end(JSON.stringify([{ id: 'ag_1', name: 'Test Agent', voiceEngine: 'poc' }])); return; }
      if (method === 'POST' && url === `${tp}/agents`) { res.writeHead(201); res.end(JSON.stringify({ id: 'ag_new', name: parsedBody.name, createdAt: new Date().toISOString() })); return; }
      if (route === 'GET /api/v1/agents/ag_1') { res.writeHead(200); res.end(JSON.stringify({ id: 'ag_1', name: 'Test Agent' })); return; }
      if (route === 'GET /api/v1/agents/ag_1/versions') { res.writeHead(200); res.end(JSON.stringify([{ id: 'v_1', version: 1, createdAt: new Date().toISOString() }])); return; }
      if (method === 'POST' && url === '/api/v1/agents/ag_1/versions') { res.writeHead(201); res.end(JSON.stringify({ id: 'v_new', ...parsedBody })); return; }
      if (method === 'PATCH' && url === '/api/v1/agents/ag_1') { res.writeHead(200); res.end(JSON.stringify({ id: 'ag_1', ...parsedBody })); return; }
      if (method === 'DELETE' && url === '/api/v1/agents/ag_1') { res.writeHead(204); res.end(); return; }

      // knowledge bases
      if (route === `GET ${tp}/knowledge-bases`) { res.writeHead(200); res.end(JSON.stringify([{ id: 'kb_1', name: 'FAQ', agent_id: 'ag_1' }])); return; }
      if (method === 'POST' && url === `${tp}/knowledge-bases`) { res.writeHead(201); res.end(JSON.stringify({ id: 'kb_new', ...parsedBody })); return; }
      if (route === 'GET /api/v1/knowledge-bases/kb_1') { res.writeHead(200); res.end(JSON.stringify({ id: 'kb_1', name: 'FAQ' })); return; }
      if (method === 'PATCH' && url === '/api/v1/knowledge-bases/kb_1') { res.writeHead(200); res.end(JSON.stringify({ id: 'kb_1', ...parsedBody })); return; }
      if (route === 'GET /api/v1/knowledge-bases/kb_1/items') { res.writeHead(200); res.end(JSON.stringify({ items: [{ id: 'ki_1', question: 'Q', answer: 'A' }] })); return; }
      if (method === 'POST' && url === '/api/v1/knowledge-bases/kb_1/items') { res.writeHead(201); res.end(JSON.stringify({ added: parsedBody.items.length })); return; }
      if (method === 'DELETE' && url === '/api/v1/knowledge-bases/kb_1/items/ki_1') { res.writeHead(200); res.end(JSON.stringify({ success: true })); return; }
      if (route === 'GET /api/v1/knowledge-bases/kb_1/items/ki_1') { res.writeHead(200); res.end(JSON.stringify({ item: { id: 'ki_1', question: 'Q', answer: 'A' } })); return; }
      if (method === 'DELETE' && url === '/api/v1/knowledge-bases/kb_1') { res.writeHead(204); res.end(); return; }

      // subflows
      if (route === `GET ${tp}/subflows`) { res.writeHead(200); res.end(JSON.stringify([{ id: 'sf_1', name: 'Greeting', scope: 'agent' }])); return; }
      if (method === 'POST' && url === `${tp}/subflows`) { res.writeHead(201); res.end(JSON.stringify({ id: 'sf_new', ...parsedBody })); return; }
      if (route === `GET ${tp}/subflows/sf_1`) { res.writeHead(200); res.end(JSON.stringify({ id: 'sf_1', name: 'Greeting', nodes: [] })); return; }
      if (method === 'PATCH' && url === `${tp}/subflows/sf_1`) { res.writeHead(200); res.end(JSON.stringify({ id: 'sf_1', ...parsedBody })); return; }
      if (method === 'DELETE' && url === `${tp}/subflows/sf_1`) { res.writeHead(204); res.end(); return; }

      // phone numbers
      if (route === `GET ${tp}/phone-numbers`) { res.writeHead(200); res.end(JSON.stringify([{ id: 'pn_1', phoneNumber: '+14155550123', agentId: 'ag_1' }])); return; }
      if (method === 'POST' && url === '/api/v1/phone-numbers/pn_1/routing') { res.writeHead(200); res.end(JSON.stringify({ success: true, ...parsedBody })); return; }
      if (method === 'POST' && url === '/api/v1/phone-numbers/pn_1/call') { res.writeHead(201); res.end(JSON.stringify({ callId: 'call_1', status: 'queued', ...parsedBody })); return; }
      if (route === `GET ${tp}/calls`) { res.writeHead(200); res.end(JSON.stringify([{ id: 'call_1', toNumber: '+14155550999', duration: 60 }])); return; }
      if (route === 'GET /api/v1/calls/call_1') { res.writeHead(200); res.end(JSON.stringify({ id: 'call_1', transcript: 'Hello world', outcome: 'completed' })); return; }

      // contacts
      if (route === `GET ${tp}/contacts`) { res.writeHead(200); res.end(JSON.stringify([{ id: 'ct_1', name: 'John Doe', phoneNumber: '+14155550123', email: 'john@example.com', notes: 'VIP customer' }])); return; }
      if (method === 'POST' && url === `${tp}/contacts`) { res.writeHead(201); res.end(JSON.stringify({ id: 'ct_new', ...parsedBody })); return; }
      if (method === 'PATCH' && url === `${tp}/contacts`) { res.writeHead(200); res.end(JSON.stringify({ id: 'ct_1', ...parsedBody })); return; }
      if (method === 'DELETE' && url.split('?')[0] === `${tp}/contacts`) { res.writeHead(200); res.end(JSON.stringify({ success: true })); return; }

      // voices
      if (route === `GET ${tp}/voices`) { res.writeHead(200); res.end(JSON.stringify({ voices: [{ id: 'v_1', name: 'Brian', engine: 'retell' }, { id: 'v_2', name: 'Aurora', engine: 'poc' }] })); return; }
      if (route.match(/^GET \/api\/v1\/tenants\/test-tenant-123\/voices\//)) { res.writeHead(200); res.end(JSON.stringify({ voice: { id: 'v_1', name: 'Brian', engine: 'retell' } })); return; }

      // numbers — purchase + available
      if (method === 'POST' && url === `${tp}/phone-numbers/purchase`) { res.writeHead(201); res.end(JSON.stringify({ id: 'pn_new', phoneNumber: '+14155550999', ...parsedBody })); return; }
      if (route === `GET ${tp}/phone-numbers/available`) {
        const { searchParams } = new URL(url, `http://localhost:${port}`);
        const areaCode = searchParams.get('areaCode') || '415';
        const type = searchParams.get('type') || 'local';
        res.writeHead(200);
        res.end(JSON.stringify({ numbers: [{ phoneNumber: `+1${areaCode}5550100`, friendlyName: `(415) 555-0100`, locality: 'San Francisco', region: 'CA', type, capabilities: { voice: true, SMS: true, MMS: true } }] }));
        return;
      }

      // SMS
      if (method === 'POST' && url === `${tp}/sms`) { res.writeHead(201); res.end(JSON.stringify({ sms: { id: 'sms_new', ...parsedBody, direction: 'outbound', status: 'queued' } })); return; }
      if (route === `GET ${tp}/sms`) { res.writeHead(200); res.end(JSON.stringify({ smsMessages: [{ id: 'sms_1', fromNumber: '+14155550123', toNumber: '+14155550999', body: 'Hello', direction: 'outbound' }] })); return; }
      if (route.match(/^GET \/api\/v1\/sms\/sms_1/)) { res.writeHead(200); res.end(JSON.stringify({ sms: { id: 'sms_1', fromNumber: '+14155550123', toNumber: '+14155550999', body: 'Hello', direction: 'outbound' } })); return; }

      // usage
      if (route === `GET ${tp}/usage`) { res.writeHead(200); res.end(JSON.stringify({ totals: { callMinutes: 123, smsMessages: 45, smsSegments: 45, numberCost: 4.0 }, series: [{ date: '2025-01-01', callMinutes: 20, smsCount: 5 }] })); return; }
      if (route === `GET ${tp}/webhooks`) { res.writeHead(200); res.end(JSON.stringify([{ id: 'wh_1', url: 'https://example.com/webhook', events: ['call.completed'] }])); return; }
      if (method === 'POST' && url === `${tp}/webhooks`) { res.writeHead(201); res.end(JSON.stringify({ id: 'wh_new', secret: 'sec_123', ...parsedBody })); return; }
      if (route === `GET ${tp}/webhooks/wh_1`) { res.writeHead(200); res.end(JSON.stringify({ id: 'wh_1', url: 'https://example.com/webhook' })); return; }
      if (method === 'PATCH' && url === `${tp}/webhooks/wh_1`) { res.writeHead(200); res.end(JSON.stringify({ id: 'wh_1', ...parsedBody })); return; }
      if (method === 'POST' && url === `${tp}/webhooks/wh_1/test`) { res.writeHead(200); res.end(JSON.stringify({ sent: true, event: parsedBody?.event || 'call.completed' })); return; }
      if (method === 'DELETE' && url === `${tp}/webhooks/wh_1`) { res.writeHead(204); res.end(); return; }

      // analytics
      if (route === `GET ${tp}/analytics`) { res.writeHead(200); res.end(JSON.stringify({ days: 7, calls: 42 })); return; }
      if (route === `GET ${tp}/qa/overview`) { res.writeHead(200); res.end(JSON.stringify({ resolutionRate: 0.85, avgScore: 4.2 })); return; }

      // batch calls
      if (route === `GET ${tp}/batch-calls`) { res.writeHead(200); res.end(JSON.stringify([{ id: 'bc_1', name: 'Campaign', status: 'pending' }])); return; }
      if (method === 'POST' && url === `${tp}/batch-calls`) { res.writeHead(201); res.end(JSON.stringify({ id: 'bc_new', ...parsedBody })); return; }
      if (route === 'GET /api/v1/batch-calls/bc_1') { res.writeHead(200); res.end(JSON.stringify({ id: 'bc_1', name: 'Campaign', status: 'pending', targets: [] })); return; }
      if (method === 'POST' && url === '/api/v1/batch-calls/bc_1/run') { res.writeHead(200); res.end(JSON.stringify({ success: true, status: 'running' })); return; }

      // templates
      if (route === 'GET /api/v1/agent-templates') { res.writeHead(200); res.end(JSON.stringify([{ id: 'tmpl_1', name: 'Receptionist', defaultVariables: { business_name: 'My Business' } }])); return; }

      // environments
      if (route === 'GET /api/v1/agents/ag_1/environments') { res.writeHead(200); res.end(JSON.stringify({ staging: null, production: 'v_42' })); return; }
      if (method === 'POST' && url === '/api/v1/agents/ag_1/environments/staging/promote') { res.writeHead(200); res.end(JSON.stringify({ success: true, environment: 'staging', versionId: parsedBody?.versionId })); return; }

      res.writeHead(404);
      res.end(JSON.stringify({ error: `Unhandled route: ${route}` }));
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ server, port, requests, close: () => server.close() });
    });
  });
}
