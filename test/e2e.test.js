/**
 * E2E test for calldesktech-mcp.
 * Starts a mock API, spawns the MCP server over stdio, and exercises every tool
 * added in this development session.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { startMockApi } from './mock-api.js';

const ROOT = new URL('../', import.meta.url).pathname;

async function sendRequest(proc, req) {
  return new Promise((resolve, reject) => {
    const id = req.id;
    const chunks = [];
    const onData = (buf) => {
      const text = buf.toString();
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === id) {
            proc.stdout.off('data', onData);
            resolve(msg);
            return;
          }
        } catch {}
        chunks.push(line);
      }
    };
    proc.stdout.on('data', onData);
    proc.stdin.write(JSON.stringify(req) + '\n');
    setTimeout(() => {
      proc.stdout.off('data', onData);
      reject(new Error(`Timeout waiting for response to ${req.method} (id=${id})`));
    }, 5000);
  });
}

describe('calldesktech-mcp E2E', { concurrency: false }, () => {
  let mock;
  let proc;

  before(async () => {
    mock = await startMockApi(9876);
    proc = spawn('node', ['index.js'], {
      cwd: ROOT,
      env: {
        ...process.env,
        CALLDESK_API_KEY: 'test-key-123',
        CALLDESK_BASE_URL: 'http://localhost:9876/api/v1',
      },
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    // Wait for server to be ready
    await new Promise((r) => setTimeout(r, 500));
  });

  after(() => {
    proc?.kill();
    mock?.close();
  });

  // ============================================================
  // Phase 1: Initialize + ListTools
  // ============================================================
  it('initializes and lists tools', async () => {
    const init = await sendRequest(proc, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
    });
    assert.strictEqual(init.result?.protocolVersion, '2024-11-05');

    const list = await sendRequest(proc, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });
    const toolNames = list.result?.tools?.map((t) => t.name) || [];
    // Verify all tools from this session exist
    const expected = [
      'flow_authoring_guide', 'whoami', 'account_overview',
      'list_agents', 'create_agent', 'get_agent', 'rename_agent', 'delete_agent',
      'list_agent_versions', 'publish_agent_version',
      'list_agent_templates', 'create_agent_from_template',
      'list_voices', 'get_voice',
      'list_subflows', 'create_subflow', 'get_subflow', 'update_subflow', 'delete_subflow',
      'list_knowledge_bases', 'create_knowledge_base', 'get_knowledge_base',
      'update_knowledge_base', 'add_knowledge_items', 'delete_knowledge_items', 'delete_knowledge_base',
      'list_phone_numbers', 'search_numbers', 'buy_number', 'set_number_routing',
      'list_agent_environments', 'promote_agent_environment',
      'place_call', 'list_calls', 'get_call',
      'send_sms', 'list_sms', 'get_sms',
      'list_contacts', 'manage_contact',
      'list_batch_calls', 'create_batch_call', 'get_batch_call', 'run_batch_call',
      'list_webhooks', 'create_webhook', 'get_webhook', 'update_webhook', 'test_webhook', 'delete_webhook',
      'get_analytics', 'get_usage', 'get_qa_overview',
    ];
    for (const name of expected) {
      assert.ok(toolNames.includes(name), `Missing tool: ${name}`);
    }
    assert.strictEqual(toolNames.length, expected.length, `Tool count mismatch: got ${toolNames.length}, expected ${expected.length}`);
  });

  // ============================================================
  // Phase 2: Account & Agent Tools (read-only)
  // ============================================================
  it('whoami returns tenant info', async () => {
    const res = await callTool(proc, 'whoami', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.tenantId, 'test-tenant-123');
  });

  it('account_overview aggregates all resources', async () => {
    const res = await callTool(proc, 'account_overview', {});
    const text = res.result?.content?.[0]?.text || '';
    assert.ok(text.includes('Agents: 1'));
    assert.ok(text.includes('Phone Numbers: 1'));
    assert.ok(text.includes('Knowledge Bases: 1'));
    assert.ok(text.includes('Subflows: 1'));
    assert.ok(text.includes('Webhooks: 1'));
    assert.ok(text.includes('Recent Calls:'));
    assert.ok(text.includes('Recent SMS:'));
    assert.ok(text.includes('Batch Calls: 1'));
  });

  it('list_agents returns agents', async () => {
    const res = await callTool(proc, 'list_agents', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
    assert.strictEqual(data[0].id, 'ag_1');
  });

  it('get_agent fetches one agent', async () => {
    const res = await callTool(proc, 'get_agent', { agentId: 'ag_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'ag_1');
  });

  it('list_agent_versions returns versions', async () => {
    const res = await callTool(proc, 'list_agent_versions', { agentId: 'ag_1' });
    // Mock returns array
    assert.ok(!res.result?.isError);
  });

  it('list_agent_templates returns templates', async () => {
    const res = await callTool(proc, 'list_agent_templates', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
  });

  // ============================================================
  // Phase 3: Voice Tools
  // ============================================================
  it('list_voices returns voices', async () => {
    const res = await callTool(proc, 'list_voices', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
    assert.strictEqual(data[0].id, 'v_1');
  });

  it('get_voice returns voice details', async () => {
    const res = await callTool(proc, 'get_voice', { voiceId: 'v_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'v_1');
    assert.ok(data.name);
  });

  // ============================================================
  // Phase 4: Subflow Tools
  // ============================================================
  it('list_subflows returns subflows', async () => {
    const res = await callTool(proc, 'list_subflows', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
  });

  it('get_subflow fetches one subflow', async () => {
    const res = await callTool(proc, 'get_subflow', { subflowId: 'sf_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'sf_1');
  });

  it('create_subflow creates a subflow', async () => {
    const res = await callTool(proc, 'create_subflow', { name: 'Test', scope: 'agent', nodes: [], startNodeId: 'start' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'sf_new');
  });

  // ============================================================
  // Phase 5: Knowledge Base Tools
  // ============================================================
  it('list_knowledge_bases returns KBs', async () => {
    const res = await callTool(proc, 'list_knowledge_bases', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
  });

  it('get_knowledge_base fetches KB with items', async () => {
    const res = await callTool(proc, 'get_knowledge_base', { knowledgeBaseId: 'kb_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'kb_1');
    assert.ok(Array.isArray(data.items));
  });

  it('update_knowledge_base patches KB', async () => {
    const res = await callTool(proc, 'update_knowledge_base', { knowledgeBaseId: 'kb_1', name: 'Updated FAQ' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.name, 'Updated FAQ');
  });

  it('add_knowledge_items adds items', async () => {
    const res = await callTool(proc, 'add_knowledge_items', {
      knowledgeBaseId: 'kb_1',
      items: [{ question: 'Hours?', answer: '9-5' }],
    });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.added, 1);
  });

  it('delete_knowledge_items removes items', async () => {
    const res = await callTool(proc, 'delete_knowledge_items', {
      knowledgeBaseId: 'kb_1',
      itemIds: ['ki_1'],
    });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.deleted, 1);
  });

  // ============================================================
  // Phase 6: Phone Number Tools
  // ============================================================
  it('list_phone_numbers returns numbers', async () => {
    const res = await callTool(proc, 'list_phone_numbers', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
  });

  it('search_numbers finds available numbers', async () => {
    const res = await callTool(proc, 'search_numbers', { country: 'US', areaCode: '415' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
    assert.strictEqual(data[0].country, 'US');
  });

  it('buy_number purchases a number', async () => {
    const res = await callTool(proc, 'buy_number', { phoneNumber: '+14155550999', country: 'US' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'pn_new');
    assert.strictEqual(data.status, 'active');
  });

  // ============================================================
  // Phase 7: SMS Tools
  // ============================================================
  it('send_sms sends a message', async () => {
    const res = await callTool(proc, 'send_sms', { phoneNumberId: 'pn_1', toNumber: '+14155550999', body: 'Hello' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'sms_1');
    assert.strictEqual(data.status, 'queued');
  });

  it('list_sms returns messages', async () => {
    const res = await callTool(proc, 'list_sms', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
  });

  it('get_sms returns one message', async () => {
    const res = await callTool(proc, 'get_sms', { smsId: 'sms_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'sms_1');
  });

  // ============================================================
  // Phase 8: Contact Tools
  // ============================================================
  it('list_contacts returns contacts', async () => {
    const res = await callTool(proc, 'list_contacts', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
    assert.strictEqual(data[0].id, 'ct_1');
  });

  it('manage_contact creates a contact', async () => {
    const res = await callTool(proc, 'manage_contact', { action: 'create', name: 'Jane', phoneNumber: '+14155550123' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'ct_new');
    assert.strictEqual(data.name, 'Jane');
  });

  it('manage_contact updates a contact', async () => {
    const res = await callTool(proc, 'manage_contact', { action: 'update', contactId: 'ct_1', name: 'John Updated' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.name, 'John Updated');
  });

  it('manage_contact deletes a contact', async () => {
    const res = await callTool(proc, 'manage_contact', { action: 'delete', contactId: 'ct_1' });
    // 204 No Content = empty response, which JSON.parse('') throws; verify not an error
    assert.ok(!res.result?.isError);
  });

  // ============================================================
  // Phase 9: Webhook Tools
  // ============================================================
  it('list_webhooks returns webhooks', async () => {
    const res = await callTool(proc, 'list_webhooks', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
  });

  it('get_webhook fetches one webhook', async () => {
    const res = await callTool(proc, 'get_webhook', { webhookId: 'wh_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'wh_1');
  });

  it('update_webhook patches webhook', async () => {
    const res = await callTool(proc, 'update_webhook', { webhookId: 'wh_1', url: 'https://new.example.com' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.url, 'https://new.example.com');
  });

  it('test_webhook sends a test event', async () => {
    const res = await callTool(proc, 'test_webhook', { webhookId: 'wh_1', event: 'call.completed' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.sent, true);
  });

  // ============================================================
  // Phase 10: Analytics Tools
  // ============================================================
  it('get_analytics returns call stats', async () => {
    const res = await callTool(proc, 'get_analytics', { days: '7' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.days, 7);
  });

  it('get_usage returns billing breakdown', async () => {
    const res = await callTool(proc, 'get_usage', { startDate: '2026-09-01', endDate: '2026-09-30', granularity: 'day' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.callMinutes, 120);
    assert.strictEqual(data.smsSegments, 45);
  });

  it('get_qa_overview returns QA metrics', async () => {
    const res = await callTool(proc, 'get_qa_overview', { days: '30' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(typeof data.resolutionRate === 'number');
  });

  // ============================================================
  // Phase 11: Verify API paths hit by each tool
  // ============================================================
  it('hits the correct API endpoints for all new tools', () => {
    const newToolPaths = [
      { method: 'GET', path: '/api/v1/tenants/test-tenant-123/voices' },           // list_voices
      { method: 'GET', path: '/api/v1/voices/v_1' },                               // get_voice
      { method: 'GET', path: '/api/v1/tenants/test-tenant-123/available-numbers' }, // search_numbers
      { method: 'POST', path: '/api/v1/tenants/test-tenant-123/phone-numbers' },   // buy_number
      { method: 'POST', path: '/api/v1/phone-numbers/pn_1/sms' },                 // send_sms
      { method: 'GET', path: '/api/v1/tenants/test-tenant-123/sms' },             // list_sms
      { method: 'GET', path: '/api/v1/sms/sms_1' },                               // get_sms
      { method: 'GET', path: '/api/v1/tenants/test-tenant-123/contacts' },        // list_contacts
      { method: 'POST', path: '/api/v1/tenants/test-tenant-123/contacts' },       // manage_contact create
      { method: 'PATCH', path: '/api/v1/contacts/ct_1' },                          // manage_contact update
      { method: 'DELETE', path: '/api/v1/contacts/ct_1' },                         // manage_contact delete
      { method: 'GET', path: '/api/v1/tenants/test-tenant-123/webhooks/wh_1' },   // get_webhook
      { method: 'PATCH', path: '/api/v1/tenants/test-tenant-123/webhooks/wh_1' },  // update_webhook
      { method: 'POST', path: '/api/v1/tenants/test-tenant-123/webhooks/wh_1/test' }, // test_webhook
      { method: 'GET', path: '/api/v1/tenants/test-tenant-123/usage' },           // get_usage
      { method: 'GET', path: '/api/v1/tenants/test-tenant-123/subflows/sf_1' },   // get_subflow
      { method: 'PATCH', path: '/api/v1/knowledge-bases/kb_1' },                    // update_knowledge_base
      { method: 'DELETE', path: '/api/v1/knowledge-bases/kb_1/items' },            // delete_knowledge_items
    ];

    for (const expected of newToolPaths) {
      const found = mock.requests.some(
        (r) => r.method === expected.method && r.path === expected.path
      );
      assert.ok(found, `Expected API call: ${expected.method} ${expected.path}`);
    }
  });
});

async function callTool(proc, name, args) {
  return sendRequest(proc, {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 100000),
    method: 'tools/call',
    params: { name, arguments: args },
  });
}
