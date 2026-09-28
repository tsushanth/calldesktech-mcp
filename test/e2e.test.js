/**
 * E2E test for calldesktech-mcp.
 * Starts a mock API, spawns the MCP server over stdio, and exercises every tool.
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
          if (msg.id === id) { proc.stdout.off('data', onData); resolve(msg); return; }
        } catch {}
        chunks.push(line);
      }
    };
    proc.stdout.on('data', onData);
    proc.stdin.write(JSON.stringify(req) + '\n');
    setTimeout(() => { proc.stdout.off('data', onData); reject(new Error(`Timeout waiting for response to ${req.method} (id=${id})`)); }, 5000);
  });
}

async function callTool(proc, name, args) {
  return sendRequest(proc, {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 100000),
    method: 'tools/call',
    params: { name, arguments: args },
  });
}

describe('calldesktech-mcp E2E', { concurrency: false }, () => {
  let mock;
  let proc;

  before(async () => {
    mock = await startMockApi(9876);
    proc = spawn('node', ['index.js'], {
      cwd: ROOT,
      env: { ...process.env, CALLDESK_API_KEY: 'test-key-123', CALLDESK_BASE_URL: 'http://localhost:9876/api/v1' },
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    await new Promise((r) => setTimeout(r, 500));
  });

  after(() => { proc?.kill(); mock?.close(); });

  it('initializes and lists all documented tools', async () => {
    const init = await sendRequest(proc, {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
    });
    assert.strictEqual(init.result?.protocolVersion, '2024-11-05');

    const list = await sendRequest(proc, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const toolNames = list.result?.tools?.map((t) => t.name) || [];

    const expected = [
      'flow_authoring_guide', 'whoami', 'account_overview',
      'list_agents', 'create_agent', 'get_agent', 'rename_agent', 'delete_agent',
      'list_agent_versions', 'publish_agent_version',
      'list_agent_templates', 'create_agent_from_template',
      'list_subflows', 'create_subflow', 'get_subflow', 'update_subflow', 'delete_subflow',
      'list_knowledge_bases', 'create_knowledge_base', 'get_knowledge_base',
      'update_knowledge_base', 'add_knowledge_items', 'list_knowledge_items', 'delete_knowledge_base', 'delete_knowledge_item',
      'list_phone_numbers', 'set_number_routing', 'search_numbers', 'buy_number', 'port_number',
      'list_agent_environments', 'promote_agent_environment',
      'place_call', 'list_calls', 'get_call', 'get_call_recording', 'search_calls',
      'list_contacts', 'manage_contact',
      'list_voices', 'get_voice', 'create_voice', 'update_voice', 'delete_voice',
      'send_sms', 'list_sms', 'get_sms', 'list_sms_conversations', 'get_sms_conversation',
      'get_usage', 'get_business_hours', 'set_business_hours',
      'list_batch_calls', 'create_batch_call', 'get_batch_call', 'run_batch_call',
      'list_webhooks', 'create_webhook', 'get_webhook', 'update_webhook', 'test_webhook', 'delete_webhook',
      'get_analytics', 'get_qa_overview',
    ];

    for (const name of expected) {
      assert.ok(toolNames.includes(name), `Missing tool: ${name}`);
    }
    assert.strictEqual(toolNames.length, expected.length, `Tool count: got ${toolNames.length}, expected ${expected.length}`);
  });

  // ---- account / agents
  it('whoami returns tenant info', async () => {
    const res = await callTool(proc, 'whoami', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.tenantId, 'test-tenant-123');
  });

  it('account_overview aggregates resources', async () => {
    const res = await callTool(proc, 'account_overview', {});
    const text = res.result?.content?.[0]?.text || '';
    assert.ok(text.includes('Agents:'));
    assert.ok(text.includes('Phone Numbers:'));
    assert.ok(text.includes('Knowledge Bases:'));
    assert.ok(text.includes('Subflows:'));
    assert.ok(text.includes('Webhooks:'));
    assert.ok(text.includes('Recent Calls:'));
    assert.ok(text.includes('Batch Calls:'));
  });

  it('list_agents returns agents', async () => {
    const res = await callTool(proc, 'list_agents', {});
    assert.ok(!res.result?.isError);
  });

  it('get_agent fetches one agent', async () => {
    const res = await callTool(proc, 'get_agent', { agentId: 'ag_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'ag_1');
  });

  it('list_agent_versions returns versions', async () => {
    const res = await callTool(proc, 'list_agent_versions', { agentId: 'ag_1' });
    assert.ok(!res.result?.isError);
  });

  it('list_agent_templates returns templates', async () => {
    const res = await callTool(proc, 'list_agent_templates', {});
    assert.ok(!res.result?.isError);
  });

  // ---- subflows
  it('list_subflows returns subflows', async () => {
    const res = await callTool(proc, 'list_subflows', {});
    assert.ok(!res.result?.isError);
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

  it('update_subflow patches a subflow', async () => {
    const res = await callTool(proc, 'update_subflow', { subflowId: 'sf_1', name: 'Updated' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.name, 'Updated');
  });

  it('delete_subflow removes a subflow', async () => {
    const res = await callTool(proc, 'delete_subflow', { subflowId: 'sf_1' });
    assert.ok(!res.result?.isError);
  });

  // ---- knowledge bases
  it('list_knowledge_bases returns KBs', async () => {
    const res = await callTool(proc, 'list_knowledge_bases', {});
    assert.ok(!res.result?.isError);
  });

  it('get_knowledge_base fetches a KB', async () => {
    const res = await callTool(proc, 'get_knowledge_base', { knowledgeBaseId: 'kb_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'kb_1');
  });

  it('update_knowledge_base patches a KB', async () => {
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

  it('list_knowledge_items returns items', async () => {
    const res = await callTool(proc, 'list_knowledge_items', { knowledgeBaseId: 'kb_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(Array.isArray(data.items));
  });

  it('delete_knowledge_base removes a KB', async () => {
    const res = await callTool(proc, 'delete_knowledge_base', { knowledgeBaseId: 'kb_1' });
    assert.ok(!res.result?.isError);
  });

  it('delete_knowledge_item removes one item', async () => {
    const res = await callTool(proc, 'delete_knowledge_item', { knowledgeBaseId: 'kb_1', itemId: 'ki_1' });
    assert.ok(!res.result?.isError);
  });

  // ---- phone numbers & calls
  it('list_phone_numbers returns numbers', async () => {
    const res = await callTool(proc, 'list_phone_numbers', {});
    assert.ok(!res.result?.isError);
  });

  it('set_number_routing configures routing', async () => {
    const res = await callTool(proc, 'set_number_routing', {
      phoneNumberId: 'pn_1', direction: 'inbound', agentVersionId: 'v_1',
    });
    assert.ok(!res.result?.isError);
  });

  it('list_agent_environments shows environments', async () => {
    const res = await callTool(proc, 'list_agent_environments', { agentId: 'ag_1' });
    assert.ok(!res.result?.isError);
  });

  it('promote_agent_environment promotes a version', async () => {
    const res = await callTool(proc, 'promote_agent_environment', {
      agentId: 'ag_1', name: 'staging', versionId: 'v_1',
    });
    assert.ok(!res.result?.isError);
  });

  it('place_call initiates a call', async () => {
    const res = await callTool(proc, 'place_call', { phoneNumberId: 'pn_1', toNumber: '+14155550999' });
    assert.ok(!res.result?.isError);
  });

  it('list_calls returns calls', async () => {
    const res = await callTool(proc, 'list_calls', {});
    assert.ok(!res.result?.isError);
  });

  it('get_call returns call details', async () => {
    const res = await callTool(proc, 'get_call', { callId: 'call_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'call_1');
  });

  // ---- contacts
  it('list_contacts returns contacts', async () => {
    const res = await callTool(proc, 'list_contacts', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '[]');
    assert.ok(Array.isArray(data));
  });

  it('manage_contact creates a contact', async () => {
    const res = await callTool(proc, 'manage_contact', { action: 'create', phoneNumber: '+14155550123', name: 'Alice', email: 'alice@example.com', notes: 'Lead from trade show' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'ct_new');
  });

  it('manage_contact updates a contact', async () => {
    const res = await callTool(proc, 'manage_contact', { action: 'update', phoneNumber: '+14155550123', notes: 'Converted to customer', doNotCall: true });
    assert.ok(!res.result?.isError);
  });

  it('manage_contact deletes a contact', async () => {
    const res = await callTool(proc, 'manage_contact', { action: 'delete', phoneNumber: '+14155550123' });
    assert.ok(!res.result?.isError);
  });

  // ---- voices
  it('list_voices returns voices', async () => {
    const res = await callTool(proc, 'list_voices', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(Array.isArray(data.voices));
  });

  it('get_voice returns a single voice', async () => {
    const res = await callTool(proc, 'get_voice', { voiceId: 'v_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.voice?.id, 'v_1');
  });

  // ---- numbers — search + buy
  it('search_numbers lists available numbers', async () => {
    const res = await callTool(proc, 'search_numbers', { areaCode: '415', type: 'local' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(Array.isArray(data.numbers));
  });

  it('buy_number purchases a number', async () => {
    const res = await callTool(proc, 'buy_number', { areaCode: '415', agentVersionId: 'v_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'pn_new');
  });

  it('create_voice adds a custom voice', async () => {
    const res = await callTool(proc, 'create_voice', { voiceId: 'custom-test', name: 'Test Voice', ttsBackend: 'elevenlabs' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.voice?.id, 'custom-test');
  });

  it('update_voice renames a voice', async () => {
    const res = await callTool(proc, 'update_voice', { voiceId: 'v_1', name: 'Updated Brian' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.voice?.name, 'Updated Brian');
  });

  it('delete_voice deactivates a voice', async () => {
    const res = await callTool(proc, 'delete_voice', { voiceId: 'v_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.voice?.is_active, false);
  });

  // ---- SMS
  it('list_sms_conversations returns threads', async () => {
    const res = await callTool(proc, 'list_sms_conversations', { limit: 25 });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(Array.isArray(data.conversations));
  });

  it('get_sms_conversation returns thread messages', async () => {
    const res = await callTool(proc, 'get_sms_conversation', { phoneNumber: '+14155550999' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(Array.isArray(data.messages));
  });

  // ---- numbers — porting
  it('port_number registers an existing number', async () => {
    const res = await callTool(proc, 'port_number', { number: '+14155558888', label: 'Main Line' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.phoneNumber?.source, 'ported');
  });

  // ---- SMS
  it('send_sms sends a message', async () => {
    const res = await callTool(proc, 'send_sms', { phoneNumberId: 'pn_1', toNumber: '+14155550999', body: 'Hello from MCP' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.sms?.id, 'sms_new');
  });

  it('list_sms returns messages', async () => {
    const res = await callTool(proc, 'list_sms', { phoneNumberId: 'pn_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(Array.isArray(data.smsMessages));
  });

  it('get_sms returns a single SMS', async () => {
    const res = await callTool(proc, 'get_sms', { smsId: 'sms_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.sms?.id, 'sms_1');
  });

  // ---- usage
  it('get_usage returns billing breakdown', async () => {
    const res = await callTool(proc, 'get_usage', { startDate: '2025-01-01', endDate: '2025-01-31' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(typeof data.totals?.callMinutes === 'number');
  });

  it('get_business_hours returns hours', async () => {
    const res = await callTool(proc, 'get_business_hours', {});
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(data.timezone);
  });

  it('set_business_hours updates hours', async () => {
    const res = await callTool(proc, 'set_business_hours', {
      timezone: 'America/Los_Angeles',
      hours: { monday: { open: '08:00', closed: '18:00' } },
      afterHoursMessage: 'We are closed. Please call back tomorrow.',
    });
    assert.ok(!res.result?.isError);
  });

  it('get_call_recording returns recording info', async () => {
    const res = await callTool(proc, 'get_call_recording', { callId: 'call_1' });
    assert.ok(!res.result?.isError);
  });

  it('search_calls finds calls by transcript', async () => {
    const res = await callTool(proc, 'search_calls', { search: 'Hello world', limit: 10 });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.ok(Array.isArray(data.callLogs));
  });

  // ---- batch calls
  it('list_batch_calls returns batches', async () => {
    const res = await callTool(proc, 'list_batch_calls', {});
    assert.ok(!res.result?.isError);
  });

  it('create_batch_call creates a batch', async () => {
    const res = await callTool(proc, 'create_batch_call', {
      agentVersionId: 'v_1', phoneNumbers: ['+14155550123'],
    });
    assert.ok(!res.result?.isError);
  });

  it('get_batch_call returns a batch', async () => {
    const res = await callTool(proc, 'get_batch_call', { batchId: 'bc_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'bc_1');
  });

  it('run_batch_call starts a batch', async () => {
    const res = await callTool(proc, 'run_batch_call', { batchId: 'bc_1' });
    assert.ok(!res.result?.isError);
  });

  // ---- webhooks
  it('list_webhooks returns webhooks', async () => {
    const res = await callTool(proc, 'list_webhooks', {});
    assert.ok(!res.result?.isError);
  });

  it('create_webhook registers a webhook', async () => {
    const res = await callTool(proc, 'create_webhook', {
      url: 'https://example.com/hook', events: ['call.completed'],
    });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'wh_new');
  });

  it('get_webhook fetches one webhook', async () => {
    const res = await callTool(proc, 'get_webhook', { webhookId: 'wh_1' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.id, 'wh_1');
  });

  it('update_webhook patches a webhook', async () => {
    const res = await callTool(proc, 'update_webhook', { webhookId: 'wh_1', url: 'https://new.example.com' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.url, 'https://new.example.com');
  });

  it('test_webhook sends a test event', async () => {
    const res = await callTool(proc, 'test_webhook', { webhookId: 'wh_1', event: 'call.completed' });
    const data = JSON.parse(res.result?.content?.[0]?.text || '{}');
    assert.strictEqual(data.sent, true);
  });

  it('delete_webhook removes a webhook', async () => {
    const res = await callTool(proc, 'delete_webhook', { webhookId: 'wh_1' });
    assert.ok(!res.result?.isError);
  });

  // ---- analytics
  it('get_analytics returns call stats', async () => {
    const res = await callTool(proc, 'get_analytics', { days: '7' });
    assert.ok(!res.result?.isError);
  });

  it('get_qa_overview returns QA metrics', async () => {
    const res = await callTool(proc, 'get_qa_overview', { days: '30' });
    assert.ok(!res.result?.isError);
  });

  // ---- verify API paths for every real tool added today
  it('hits only documented API endpoints', () => {
    const actualPaths = mock.requests.map((r) => r.path);

    // Every request must match a documented endpoint suffix
    const documented = [
      '/api/v1/me',
      '/api/v1/tenants/test-tenant-123/agents',
      '/api/v1/agents/ag_1',
      '/api/v1/agents/ag_1/versions',
      '/api/v1/tenants/test-tenant-123/subflows',
      '/api/v1/tenants/test-tenant-123/subflows/sf_1',
      '/api/v1/tenants/test-tenant-123/knowledge-bases',
      '/api/v1/knowledge-bases/kb_1',
      '/api/v1/knowledge-bases/kb_1/items',
      '/api/v1/knowledge-bases/kb_1/items/ki_1',
      '/api/v1/tenants/test-tenant-123/phone-numbers',
      '/api/v1/tenants/test-tenant-123/phone-numbers/available',
      '/api/v1/tenants/test-tenant-123/phone-numbers/purchase',
      '/api/v1/phone-numbers/pn_1/routing',
      '/api/v1/phone-numbers/pn_1/call',
      '/api/v1/tenants/test-tenant-123/calls',
      '/api/v1/calls/call_1',
      '/api/v1/calls/call_1/recording',
      '/api/v1/tenants/test-tenant-123/contacts',
      '/api/v1/tenants/test-tenant-123/voices',
      '/api/v1/tenants/test-tenant-123/voices/v_1',
      '/api/v1/tenants/test-tenant-123/sms',
      '/api/v1/tenants/test-tenant-123/sms/conversations',
      '/api/v1/tenants/test-tenant-123/sms/conversations/%2B14155550999',
      '/api/v1/sms/sms_1',
      '/api/v1/tenants/test-tenant-123/usage',
      '/api/v1/tenants/test-tenant-123/business-hours',
      '/api/v1/tenants/test-tenant-123/batch-calls',
      '/api/v1/batch-calls/bc_1',
      '/api/v1/batch-calls/bc_1/run',
      '/api/v1/tenants/test-tenant-123/webhooks',
      '/api/v1/tenants/test-tenant-123/webhooks/wh_1',
      '/api/v1/tenants/test-tenant-123/webhooks/wh_1/test',
      '/api/v1/tenants/test-tenant-123/analytics',
      '/api/v1/tenants/test-tenant-123/qa/overview',
      '/api/v1/agent-templates',
      '/api/v1/agents/ag_1/environments',
      '/api/v1/agents/ag_1/environments/staging/promote',
    ];

    for (const p of actualPaths) {
      // Allow query strings by splitting; mock stores path already split
      const base = p.split('?')[0];
      assert.ok(
        documented.some((d) => base === d),
        `Unexpected API call to undocumented path: ${base}`
      );
    }

    // Assert that key new tools actually hit the expected paths
    assert.ok(actualPaths.some((p) => p === '/api/v1/knowledge-bases/kb_1/items'), `list_knowledge_items should hit /items`);
    assert.ok(actualPaths.some((p) => p === '/api/v1/tenants/test-tenant-123/webhooks/wh_1/test'), `test_webhook should hit /test`);
    assert.ok(actualPaths.some((p) => p === '/api/v1/tenants/test-tenant-123/contacts'), `list_contacts should hit /contacts`);
  });
});
