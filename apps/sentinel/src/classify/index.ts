import { config } from '../config.js';
import type { ScrapedChange, ClassifiedChange, ChangeType } from '../types.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export async function classifyChange(change: ScrapedChange): Promise<ClassifiedChange> {
  const prompt = `Classify this competitor change and generate a 2-sentence summary.

Company: ${change.companyName}
Source: ${change.sourceTitle}
URL: ${change.sourceUrl}
Text: ${change.rawText}

Respond in JSON:
{
  "changeType": "regulatory|funding|hiring|pricing|product|other",
  "confidence": 0.0-1.0,
  "summary": "2-sentence summary of the change"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );

    if (!res.ok) {
      return fallbackClassify(change);
    }

    const data: GeminiResponse = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text);

    return {
      ...change,
      changeType: validateChangeType(parsed.changeType),
      confidence: clamp(parsed.confidence ?? 0.5),
      summary: parsed.summary ?? `${change.companyName} — ${change.sourceTitle}`,
    };
  } catch {
    return fallbackClassify(change);
  }
}

export async function classifyChanges(
  changes: ScrapedChange[],
): Promise<ClassifiedChange[]> {
  return Promise.all(changes.map(classifyChange));
}

function fallbackClassify(change: ScrapedChange): ClassifiedChange {
  return {
    ...change,
    changeType: 'other',
    confidence: 0.3,
    summary: `${change.companyName} — ${change.sourceTitle}`,
  };
}

function validateChangeType(type: string): ChangeType {
  const valid: ChangeType[] = ['regulatory', 'funding', 'hiring', 'pricing', 'product', 'other'];
  return valid.includes(type as ChangeType) ? (type as ChangeType) : 'other';
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
