const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { coreBeliefs, upstreamBeliefs, newBelief, confidence, userNotes } = JSON.parse(event.body || '{}');

  if (!process.env.CLAUDE_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Claude API key missing' })
    };
  }

  const prompt = `
You are a logical and ethical evaluator of belief systems.

Analyze the following belief within the context of the core belief(s), upstream beliefs, user-provided notes, and confidence level.

Return:
1. A one-line TL;DR summary
2. A more detailed paragraph explanation
3. A single word status label: coherent, incoherent, contradictory, or harmful

Core Belief(s):
${coreBeliefs.join('\n')}

Upstream Beliefs:
${upstreamBeliefs.join('\n')}

Current Belief:
${newBelief}

User Notes:
${userNotes}

User Confidence: ${confidence}
`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 400,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const result = await response.json();
    const output = result?.content?.[0]?.text || '';
    const lines = output.trim().split('\n').filter(Boolean);
    const summary = lines[0] || '';
    const details = lines.slice(1, -1).join('\n').trim();
    const statusLine = lines[lines.length - 1].toLowerCase();

    let status = 'pending';
    if (statusLine.includes('harmful')) status = 'harmful';
    else if (statusLine.includes('contradictory')) status = 'contradictory';
    else if (statusLine.includes('incoherent')) status = 'incoherent';
    else if (statusLine.includes('coherent')) status = 'coherent';

    return {
      statusCode: 200,
      body: JSON.stringify({
        summary,
        details,
        status
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};