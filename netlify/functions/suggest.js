const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { existingBeliefs } = JSON.parse(event.body || '{}');

  if (!process.env.CLAUDE_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Claude API key missing' })
    };
  }

  const prompt = `
You are an AI reasoning assistant tasked with helping users explore their belief systems.

The user has already entered the following beliefs:
${existingBeliefs.map((b, i) => \`\${i + 1}. \${b}\`).join('\n')}

Suggest one new belief that might:
- Build upon these existing beliefs
- Contradict them in an interesting way
- Introduce a new angle or implication

Respond ONLY with the new belief suggestion, nothing else.
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
        max_tokens: 150,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const result = await response.json();
    const suggestion = result?.content?.[0]?.text?.trim() || 'No suggestion available.';

    return {
      statusCode: 200,
      body: JSON.stringify({ suggestion })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};