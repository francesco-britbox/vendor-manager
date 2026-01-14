/**
 * AI Analysis Service
 *
 * Provides contract analysis using OpenAI or Claude API.
 * Extracts key contract terms with confidence scores.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Contract analysis result from AI
 */
export interface AIContractAnalysis {
  expirationDate?: string;
  renewalTerms?: string;
  sla?: string;
  paymentTerms?: string;
  noticePeriod?: string;
  keyContacts?: string;
  scopeSummary?: string;
  terminationClauses?: string;
  confidenceScores: Record<string, number>;
}

/**
 * AI Provider type
 */
export type AIProvider = 'openai' | 'anthropic';

/**
 * AI analysis options
 */
export interface AIAnalysisOptions {
  provider?: AIProvider;
  model?: string;
  maxTokens?: number;
}

/**
 * Check which AI provider is configured
 */
export function getConfiguredProvider(): AIProvider | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  return null;
}

/**
 * Check if any AI provider is configured
 */
export function isAIConfigured(): boolean {
  return getConfiguredProvider() !== null;
}

/**
 * The system prompt for contract analysis
 */
const CONTRACT_ANALYSIS_PROMPT = `You are a contract analysis expert. Analyze the provided contract text and extract the following information. For each field, provide your confidence score (0.0 to 1.0) based on how clearly the information was stated in the contract.

Extract the following fields:
1. expirationDate - The contract end/expiration date (format: human-readable, e.g., "December 31, 2025")
2. renewalTerms - Auto-renewal terms, renewal procedures, and conditions
3. sla - Service Level Agreements, uptime guarantees, response times
4. paymentTerms - Payment schedules, amounts, currency, due dates, late fees
5. noticePeriod - Required notice period for termination or changes
6. keyContacts - Important contacts mentioned (names, roles, email if available)
7. scopeSummary - Brief summary of the scope of work/services (2-3 sentences)
8. terminationClauses - Conditions under which the contract can be terminated

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
{
  "expirationDate": "string or null",
  "renewalTerms": "string or null",
  "sla": "string or null",
  "paymentTerms": "string or null",
  "noticePeriod": "string or null",
  "keyContacts": "string or null",
  "scopeSummary": "string or null",
  "terminationClauses": "string or null",
  "confidenceScores": {
    "expirationDate": 0.0,
    "renewalTerms": 0.0,
    "sla": 0.0,
    "paymentTerms": 0.0,
    "noticePeriod": 0.0,
    "keyContacts": 0.0,
    "scopeSummary": 0.0,
    "terminationClauses": 0.0
  }
}

If information for a field is not found or unclear, set the value to null and the confidence score to 0.0.
If information is partially found, set an appropriate confidence score between 0.1 and 0.7.
If information is clearly stated, set confidence score between 0.8 and 1.0.`;

/**
 * Analyze contract using OpenAI
 */
async function analyzeWithOpenAI(
  contractText: string,
  options: AIAnalysisOptions = {}
): Promise<AIContractAnalysis> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const model = options.model || 'gpt-4o';
  const maxTokens = options.maxTokens || 4096;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CONTRACT_ANALYSIS_PROMPT },
      { role: 'user', content: `Analyze this contract:\n\n${contractText}` },
    ],
    max_tokens: maxTokens,
    temperature: 0.1, // Low temperature for consistent extraction
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return parseAIResponse(content);
}

/**
 * Analyze contract using Claude (Anthropic)
 */
async function analyzeWithClaude(
  contractText: string,
  options: AIAnalysisOptions = {}
): Promise<AIContractAnalysis> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const model = options.model || 'claude-sonnet-4-20250514';
  const maxTokens = options.maxTokens || 4096;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: CONTRACT_ANALYSIS_PROMPT,
    messages: [
      { role: 'user', content: `Analyze this contract:\n\n${contractText}` },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('No response from Claude');
  }

  return parseAIResponse(content.text);
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(content: string): AIContractAnalysis {
  try {
    // Try to extract JSON from the response
    let jsonStr = content.trim();

    // Handle markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and normalize the response
    return {
      expirationDate: typeof parsed.expirationDate === 'string' ? parsed.expirationDate : undefined,
      renewalTerms: typeof parsed.renewalTerms === 'string' ? parsed.renewalTerms : undefined,
      sla: typeof parsed.sla === 'string' ? parsed.sla : undefined,
      paymentTerms: typeof parsed.paymentTerms === 'string' ? parsed.paymentTerms : undefined,
      noticePeriod: typeof parsed.noticePeriod === 'string' ? parsed.noticePeriod : undefined,
      keyContacts: typeof parsed.keyContacts === 'string' ? parsed.keyContacts : undefined,
      scopeSummary: typeof parsed.scopeSummary === 'string' ? parsed.scopeSummary : undefined,
      terminationClauses: typeof parsed.terminationClauses === 'string' ? parsed.terminationClauses : undefined,
      confidenceScores: normalizeConfidenceScores(parsed.confidenceScores),
    };
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * Normalize confidence scores to ensure valid values
 */
function normalizeConfidenceScores(scores: unknown): Record<string, number> {
  const defaultScores: Record<string, number> = {
    expirationDate: 0,
    renewalTerms: 0,
    sla: 0,
    paymentTerms: 0,
    noticePeriod: 0,
    keyContacts: 0,
    scopeSummary: 0,
    terminationClauses: 0,
  };

  if (!scores || typeof scores !== 'object') {
    return defaultScores;
  }

  const result: Record<string, number> = {};
  const validKeys = Object.keys(defaultScores);

  for (const key of validKeys) {
    const value = (scores as Record<string, unknown>)[key];
    if (typeof value === 'number' && value >= 0 && value <= 1) {
      result[key] = Math.round(value * 100) / 100; // Round to 2 decimal places
    } else {
      result[key] = 0;
    }
  }

  return result;
}

/**
 * Main function to analyze a contract
 *
 * @param contractText - The extracted text from the contract
 * @param options - Analysis options
 * @returns Contract analysis with confidence scores
 */
export async function analyzeContract(
  contractText: string,
  options: AIAnalysisOptions = {}
): Promise<AIContractAnalysis> {
  // Determine provider
  const provider = options.provider || getConfiguredProvider();

  if (!provider) {
    throw new Error(
      'No AI provider configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.'
    );
  }

  // Truncate very long contracts to avoid token limits
  const maxLength = 50000; // Approximately 12,500 tokens
  let text = contractText;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '\n\n[Contract text truncated due to length limits]';
  }

  try {
    if (provider === 'anthropic') {
      return await analyzeWithClaude(text, options);
    } else {
      return await analyzeWithOpenAI(text, options);
    }
  } catch (error) {
    console.error(`AI analysis failed with ${provider}:`, error);
    throw error;
  }
}

/**
 * Get available AI models for each provider
 */
export function getAvailableModels(provider: AIProvider): string[] {
  if (provider === 'openai') {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }
  return ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
}
