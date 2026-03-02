/**
 * Lovable AI Gateway Helper
 *
 * Uses the Lovable AI Gateway (https://ai.gateway.lovable.dev/v1/chat/completions)
 * with the pre-configured LOVABLE_API_KEY.
 *
 * Default model: google/gemini-3-flash-preview
 */

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface LovableAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LovableAIOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export async function callLovableAI(
  messages: LovableAIMessage[],
  options: LovableAIOptions = {},
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const {
    model = "google/gemini-3-flash-preview",
    temperature = 0.7,
    max_tokens = 2000,
  } = options;

  console.log(`Calling Lovable AI (${model})...`);

  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable AI error:", response.status);

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error(
        "Payment required. Please add funds to your Lovable AI workspace.",
      );
    }
    if (response.status === 401) {
      throw new Error("Invalid API key or authentication failed.");
    }
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
