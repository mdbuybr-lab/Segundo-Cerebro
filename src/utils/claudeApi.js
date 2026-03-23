/**
 * Claude API utility for all AI assistants in Segundo Cérebro
 * Uses the Anthropic Messages API with claude-opus-4-6
 */

const CLAUDE_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Call Claude API
 * @param {string} systemPrompt - System context
 * @param {Array} chatHistory - Array of {role, content}
 * @param {string} apiKey - Anthropic API key
 * @param {number} maxTokens - Max response tokens
 * @returns {Promise<string>} Response text
 */
export async function callClaude(systemPrompt, chatHistory, apiKey, maxTokens = 4096) {
  if (!apiKey) throw new Error('API Key da Anthropic não configurada. Vá em Configurações.');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: chatHistory.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'Sem resposta.';
}

/**
 * Extract structured plan from AI response
 * @param {string} text - AI response text
 * @param {string} tag - Tag name e.g. 'PLANO_TREINO' or 'PLANO_NUTRICAO'
 * @returns {{ cleanText: string, planData: object|null }}
 */
export function extractPlan(text, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const match = text.match(regex);
  if (!match) return { cleanText: text, planData: null };

  try {
    const planData = JSON.parse(match[1].trim());
    const cleanText = text.replace(regex, '').trim();
    return { cleanText, planData };
  } catch {
    return { cleanText: text, planData: null };
  }
}
