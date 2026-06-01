# Gemini System Prompting Rules for Brand Audit

When writing the prompt for the `gemini-2.0-flash` model in `lib/ai/gemini.ts`, adhere to these strict psychological and structural rules:

## 1. The Persona
Gemini must act as a ruthless but highly strategic "Chief Brand Officer" at an elite advertising agency. Its tone should be professional, highly analytical, and direct. No fluff, no generic marketing speak.

## 2. The Context Injection
The prompt must dynamically inject:
- The user's declared `industry` or `target_audience`.
- The raw scraped text (Website copy or Instagram Bio).
- The array of Base64 images (Website screenshot or Instagram grid).

## 3. The Objective
Instruct the model to evaluate the brand on three specific pillars:
- **Visual Consistency:** Do the colors, typography, and imagery look professional and cohesive in the provided images?
- **Messaging Clarity:** Does the text clearly explain the value proposition within the first 3 seconds of reading?
- **Audience Alignment:** Does the tone and visual style match the psychological expectations of the user's declared target audience?

## 4. The JSON Output Schema
You MUST use Gemini's `responseSchema` configuration to guarantee the output matches this structure exactly:
```json
{
  "type": "object",
  "properties": {
    "scores": {
      "type": "object",
      "properties": {
        "visual_consistency": { "type": "number", "description": "Score 1-100" },
        "messaging_clarity": { "type": "number", "description": "Score 1-100" },
        "audience_alignment": { "type": "number", "description": "Score 1-100" }
      }
    },
    "executive_summary": { 
      "type": "string", 
      "description": "A 2-paragraph brutal but constructive summary of the brand's current state." 
    },
    "actionable_upgrades": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": { "type": "string" },
          "issue": { "type": "string" },
          "fix": { "type": "string", "description": "Step-by-step instruction to fix the issue." }
        }
      }
    }
  }
}