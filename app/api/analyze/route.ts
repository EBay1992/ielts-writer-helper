import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { essay, taskType } = await req.json();

    if (!essay) {
      return NextResponse.json({ error: 'Essay content is required' }, { status: 400 });
    }

    const prompt = `
      Act as an expert IELTS examiner. Analyze the following IELTS Writing ${taskType || 'Task 2'} essay.
      
      Essay:
      "${essay}"
      
      Provide the response in the following JSON format. 
      IMPORTANT: 
      1. In "prioritized_suggestions", focus on high-impact changes that would arguably increase the band score by at least 0.5. Provide a concrete "example_fix" that shows exactly how to rewrite a specific part of the essay to solve the issue. If applicable, provide "apply_to_text" (exact match) and "replacement_text".
      2. In "enrichment", suggest at least 8-12 advanced vocabulary items or collocations relevant to this essay's topic. Provide "target_text" (exact match in essay) and "replacement_text" if the new word can directly replace something in the essay.
      3. In "corrections", be thorough. Identify ALL grammar, vocabulary, and punctuation errors. Aim for at least 5-10 corrections if errors exist.

      Format:
      {
        "band_score": number,
        "prioritized_suggestions": [
          {
            "priority": "high" | "medium" | "low",
            "issue": "string (concise problem description)",
            "suggestion": "string (actionable advice)",
            "example_fix": "string (a concrete example of how to rewrite a sentence or paragraph from the essay to apply this advice)",
            "apply_to_text": "string | null (exact text from essay to replace, if applicable)",
            "replacement_text": "string | null (the improved text)",
            "category": "Task Achievement" | "Coherence" | "Lexical" | "Grammar"
          }
        ],
        "enrichment": [
          {
             "word": "string (the advanced word/collocation)",
             "phonetic": "string (IPA)",
             "type": "verb" | "noun" | "adjective" | "phrase",
             "definition": "string (brief meaning)",
             "example_sentence": "string (example sentence)",
             "context_in_essay": "string (suggestion: 'Use this instead of X')",
             "target_text": "string | null (exact text from essay to replace)",
             "replacement_text": "string | null (the full replacement string)"
          }
        ],
        "feedback": {
          "task_achievement": {
            "summary": "string",
            "tips": [
              {
                "tip": "string (the advice)",
                "example_implementation": "string (obvious example of this tip in action)",
                "apply_to_text": "string | null (exact text from essay to replace/append to, if applicable)",
                "replacement_text": "string | null (the improved text)"
              }
            ]
          },
          "coherence_cohesion": {
            "summary": "string",
            "tips": [
              {
                "tip": "string",
                "example_implementation": "string",
                "apply_to_text": "string | null",
                "replacement_text": "string | null"
              }
            ]
          },
          "lexical_resource": {
            "summary": "string",
            "tips": [
              {
                "tip": "string",
                "example_implementation": "string",
                "apply_to_text": "string | null",
                "replacement_text": "string | null"
              }
            ]
          },
          "grammatical_range_accuracy": {
            "summary": "string",
            "tips": [
              {
                "tip": "string",
                "example_implementation": "string",
                "apply_to_text": "string | null",
                "replacement_text": "string | null"
              }
            ]
          }
        },
        "corrections": [
          {
            "original": "string (exact text from essay)",
            "replacement": "string (better alternative)",
            "type": "grammar" | "vocabulary" | "coherence",
            "explanation": "string (reason)"
          }
        ],
        "general_comment": "string"
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o", 
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing essay:', error);
    return NextResponse.json({ error: 'Failed to analyze essay' }, { status: 500 });
  }
}
