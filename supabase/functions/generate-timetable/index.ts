import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { preflightResponse, withCors, withCorsError } from "../_shared/cors.ts";
import { callLovableAI } from "../_shared/lovableAI.ts";

serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;

  try {
    const { teachers, constraints } = await req.json();

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return withCorsError(req, 400, "Teachers data is required");
    }

    const teacherSummary = teachers.map((t: any) => 
      `- ${t.name}: teaches ${t.subject} to ${t.section_name} (${t.schedule_info || 'flexible'})`
    ).join("\n");

    const constraintsText = constraints ? `\nAdditional constraints: ${constraints}` : "";

    const systemPrompt = `You are an expert school timetable scheduler. Generate an optimal weekly timetable based on teacher-subject-section assignments. Rules:
1. No teacher can teach two classes simultaneously
2. Distribute subjects evenly across the week
3. Avoid back-to-back sessions for the same subject
4. Morning slots (8:00-12:00) for core subjects, afternoon (12:30-15:00) for electives
5. Each period is 45 minutes with 5 minute breaks
6. Include a lunch break 12:00-12:30

Return ONLY a valid JSON array of timetable entries with this exact format:
[{
  "teacher_name": "string",
  "subject": "string",
  "section_name": "string",
  "day_of_week": 1-5 (1=Monday, 5=Friday),
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "room": "string or null"
}]

No explanation, just the JSON array.`;

    const userPrompt = `Generate a weekly timetable for these teacher-subject assignments:\n${teacherSummary}${constraintsText}\n\nCreate an optimal schedule that avoids conflicts.`;

    const result = await callLovableAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "google/gemini-3-flash-preview", temperature: 0.3, max_tokens: 4000 }
    );

    // Extract JSON from response
    let timetable;
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        timetable = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Raw:", result);
      return withCorsError(req, 500, "Failed to parse AI timetable response");
    }

    return withCors(req, { json: { timetable } });
  } catch (error) {
    console.error("generate-timetable error:", error);
    if (error instanceof Error) {
      if (error.message.includes("Rate limit")) {
        return withCorsError(req, 429, error.message);
      }
      if (error.message.includes("Payment required")) {
        return withCorsError(req, 402, error.message);
      }
    }
    return withCorsError(req, 500, "Failed to generate timetable");
  }
});
