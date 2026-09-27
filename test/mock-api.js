/**
 * Mock CallDeskTech API server for E2E testing.
 * Tracks every request so tests can assert on method, path, and body.
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

      // Auth check
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // Router
      const { method, url } = req;
      const route = `${method} ${url.split('?')[0]}`;

      // --- me / tenant
      if (route === 'GET /api/v1/me') {
        res.writeHead(200);
        res.end(JSON.stringify({ tenantId: 'test-tenant-123', name: 'Test Workspace', email: 'test@example.com' }));
        return;
      }

      const tenantPrefix = `/api/v1/tenants/test-tenant-123`;

      // --- agents
      if (route === `GET ${tenantPrefix}/agents`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'ag_1', name: 'Test Agent', voiceEngine: 'poc' }]));
        return;
      }
      if (method === 'POST' && url === `${tenantPrefix}/agents`) {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'ag_new', name: parsedBody.name, createdAt: new Date().toISOString() }));
        return;
      }
      if (route === 'GET /api/v1/agents/ag_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'ag_1', name: 'Test Agent' }));
        return;
      }
      if (route === 'GET /api/v1/agents/ag_1/versions') {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'v_1', version: 1, createdAt: new Date().toISOString() }]));
        return;
      }
      if (method === 'POST' && url === '/api/v1/agents/ag_1/versions') {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'v_new', ...parsedBody }));
        return;
      }
      if (method === 'PATCH' && url === '/api/v1/agents/ag_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'ag_1', ...parsedBody }));
        return;
      }
      if (method === 'DELETE' && url === '/api/v1/agents/ag_1') {
        res.writeHead(204);
        res.end();
        return;
      }

      // --- knowledge bases
      if (route === `GET ${tenantPrefix}/knowledge-bases`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'kb_1', name: 'FAQ', agent_id: 'ag_1' }]));
        return;
      }
      if (method === 'POST' && url === `${tenantPrefix}/knowledge-bases`) {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'kb_new', ...parsedBody }));
        return;
      }
      if (route === 'GET /api/v1/knowledge-bases/kb_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'kb_1', name: 'FAQ', items: [{ id: 'ki_1', question: 'Q', answer: 'A' }] }));
        return;
      }
      if (method === 'PATCH' && url === '/api/v1/knowledge-bases/kb_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'kb_1', ...parsedBody }));
        return;
      }
      if (method === 'POST' && url === '/api/v1/knowledge-bases/kb_1/items') {
        res.writeHead(201);
        res.end(JSON.stringify({ added: parsedBody.items.length }));
        return;
      }
      if (method === 'DELETE' && url === '/api/v1/knowledge-bases/kb_1/items') {
        res.writeHead(200);
        res.end(JSON.stringify({ deleted: parsedBody.itemIds.length }));
        return;
      }

      // --- subflows
      if (route === `GET ${tenantPrefix}/subflows`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'sf_1', name: 'Greeting', scope: 'agent' }]));
        return;
      }
      if (method === 'POST' && url === `${tenantPrefix}/subflows`) {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'sf_new', ...parsedBody }));
        return;
      }
      if (route === `GET ${tenantPrefix}/subflows/sf_1`) {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'sf_1', name: 'Greeting', nodes: [] }));
        return;
      }

      // --- phone numbers
      if (route === `GET ${tenantPrefix}/phone-numbers`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'pn_1', phoneNumber: '+14155550123', agentId: 'ag_1' }]));
        return;
      }
      if (route === `GET ${tenantPrefix}/available-numbers`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ phoneNumber: '+14155550999', monthlyCost: '2.00', country: 'US' }]));
        return;
      }
      if (method === 'POST' && url === `${tenantPrefix}/phone-numbers`) {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'pn_new', phoneNumber: parsedBody.phoneNumber || '+14155550999', status: 'active' }));
        return;
      }
      if (method === 'POST' && url === '/api/v1/phone-numbers/pn_1/routing') {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, ...parsedBody }));
        return;
      }
      if (method === 'POST' && url === '/api/v1/phone-numbers/pn_1/call') {
        res.writeHead(201);
        res.end(JSON.stringify({ callId: 'call_1', status: 'queued', ...parsedBody }));
        return;
      }
      if (route === `GET ${tenantPrefix}/calls`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'call_1', toNumber: '+14155550999', duration: 60 }]));
        return;
      }
      if (route === 'GET /api/v1/calls/call_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'call_1', transcript: 'Hello world', outcome: 'completed' }));
        return;
      }

      // --- voices
      if (route === `GET ${tenantPrefix}/voices`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'v_1', name: 'Alice', gender: 'female', language: 'en', backends: ['kokoro', 'elevenlabs'] }]));
        return;
      }
      if (route === 'GET /api/v1/voices/v_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'v_1', name: 'Alice', sampleUrl: 'https://example.com/sample.mp3' }));
        return;
      }

      // --- sms
      if (method === 'POST' && url === '/api/v1/phone-numbers/pn_1/sms') {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'sms_1', status: 'queued', ...parsedBody }));
        return;
      }
      if (route === `GET ${tenantPrefix}/sms`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'sms_1', toNumber: '+14155550999', body: 'Hello' }]));
        return;
      }
      if (route === 'GET /api/v1/sms/sms_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'sms_1', toNumber: '+14155550999', body: 'Hello', status: 'delivered' }));
        return;
      }

      // --- contacts
      if (route === `GET ${tenantPrefix}/contacts`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'ct_1', name: 'John Doe', phoneNumber: '+14155550123' }]));
        return;
      }
      if (method === 'POST' && url === `${tenantPrefix}/contacts`) {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'ct_new', ...parsedBody }));
        return;
      }
      if (method === 'PATCH' && url === '/api/v1/contacts/ct_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'ct_1', ...parsedBody }));
        return;
      }
      if (method === 'DELETE' && url === '/api/v1/contacts/ct_1') {
        res.writeHead(204);
        res.end();
        return;
      }

      // --- webhooks
      if (route === `GET ${tenantPrefix}/webhooks`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'wh_1', url: 'https://example.com/webhook', events: ['call.completed'] }]));
        return;
      }
      if (method === 'POST' && url === `${tenantPrefix}/webhooks`) {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'wh_new', secret: 'sec_123', ...parsedBody }));
        return;
      }
      if (route === `GET ${tenantPrefix}/webhooks/wh_1`) {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'wh_1', url: 'https://example.com/webhook' }));
        return;
      }
      if (method === 'PATCH' && url === `${tenantPrefix}/webhooks/wh_1`) {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'wh_1', ...parsedBody }));
        return;
      }
      if (method === 'POST' && url === `${tenantPrefix}/webhooks/wh_1/test`) {
        res.writeHead(200);
        res.end(JSON.stringify({ sent: true, event: parsedBody?.event || 'call.completed' }));
        return;
      }

      // --- analytics / usage
      if (route === `GET ${tenantPrefix}/analytics`) {
        res.writeHead(200);
        res.end(JSON.stringify({ days: 7, calls: 42 }));
        return;
      }
      if (route === `GET ${tenantPrefix}/usage`) {
        res.writeHead(200);
        res.end(JSON.stringify({ callMinutes: 120, smsSegments: 45, numberCost: '6.00' }));
        return;
      }
      if (route === `GET ${tenantPrefix}/qa/overview`) {
        res.writeHead(200);
        res.end(JSON.stringify({ resolutionRate: 0.85, avgScore: 4.2 }));
        return;
      }

      // --- batch calls
      if (route === `GET ${tenantPrefix}/batch-calls`) {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'bc_1', name: 'Campaign', status: 'pending' }]));
        return;
      }
      if (method === 'POST' && url === `${tenantPrefix}/batch-calls`) {
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'bc_new', ...parsedBody }));
        return;
      }
      if (route === 'GET /api/v1/batch-calls/bc_1') {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 'bc_1', name: 'Campaign', status: 'pending', targets: [] }));
        return;
      }
      if (method === 'POST' && url === '/api/v1/batch-calls/bc_1/run') {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, status: 'running' }));
        return;
      }

      // --- agent templates
      if (route === 'GET /api/v1/agent-templates') {
        res.writeHead(200);
        res.end(JSON.stringify([{ id: 'tmpl_1', name: 'Receptionist', defaultVariables: { business_name: 'My Business' } }]));
        return;
      }

      // --- environments
      if (route === 'GET /api/v1/agents/ag_1/environments') {
        res.writeHead(200);
        res.end(JSON.stringify({ staging: null, production: 'v_42' }));
        return;
      }
      if (method === 'POST' && url === '/api/v1/agents/ag_1/environments/staging/promote') {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, environment: 'staging', versionId: parsedBody?.versionId }));
        return;
      }

      // Fallback
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
