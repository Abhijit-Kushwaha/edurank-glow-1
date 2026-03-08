import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { section_id, term_id, org_id } = await req.json();
    if (!section_id || !term_id || !org_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all exams for this term + section
    const { data: exams, error: examsError } = await supabase
      .from("exams")
      .select("*")
      .eq("term_id", term_id)
      .eq("section_id", section_id);

    if (examsError) throw examsError;
    if (!exams || exams.length === 0) {
      return new Response(JSON.stringify({ error: "No exams found for this term and section" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all marks for these exams
    const examIds = exams.map((e: any) => e.id);
    const { data: marks, error: marksError } = await supabase
      .from("student_marks")
      .select("*, student:profiles!student_marks_student_id_fkey(name, avatar_url, email), exam:exams!student_marks_exam_id_fkey(name, subject, max_written_marks, max_internal_marks)")
      .in("exam_id", examIds);

    if (marksError) throw marksError;
    if (!marks || marks.length === 0) {
      return new Response(JSON.stringify({ error: "No marks entered yet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build student performance data
    const studentMap: Record<string, {
      name: string;
      totalObtained: number;
      totalMax: number;
      subjects: Record<string, { obtained: number; max: number; exams: string[] }>;
      absent_count: number;
    }> = {};

    for (const m of marks as any[]) {
      const sid = m.student_id;
      const sname = m.student?.name || "Unknown";
      const subject = m.exam?.subject || "Unknown";
      const maxTotal = (m.exam?.max_written_marks || 0) + (m.exam?.max_internal_marks || 0);
      const obtained = (m.written_marks || 0) + (m.internal_marks || 0);

      if (!studentMap[sid]) {
        studentMap[sid] = { name: sname, totalObtained: 0, totalMax: 0, subjects: {}, absent_count: 0 };
      }

      if (m.is_absent) {
        studentMap[sid].absent_count++;
      } else {
        studentMap[sid].totalObtained += obtained;
        studentMap[sid].totalMax += maxTotal;
      }

      if (!studentMap[sid].subjects[subject]) {
        studentMap[sid].subjects[subject] = { obtained: 0, max: 0, exams: [] };
      }
      studentMap[sid].subjects[subject].obtained += obtained;
      studentMap[sid].subjects[subject].max += maxTotal;
      studentMap[sid].subjects[subject].exams.push(m.exam?.name || "Exam");
    }

    // Calculate percentages and sort
    const studentPerformances = Object.entries(studentMap).map(([id, s]) => ({
      id,
      name: s.name,
      percentage: s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0,
      totalObtained: s.totalObtained,
      totalMax: s.totalMax,
      subjects: s.subjects,
      absent_count: s.absent_count,
    })).sort((a, b) => b.percentage - a.percentage);

    // Assign ranks
    studentPerformances.forEach((s, i) => { (s as any).rank = i + 1; });

    // Build prompt for AI
    const performanceSummary = studentPerformances.map(s => {
      const subjectDetails = Object.entries(s.subjects)
        .map(([sub, data]) => `${sub}: ${data.obtained}/${data.max} (${data.max > 0 ? ((data.obtained / data.max) * 100).toFixed(1) : 0}%)`)
        .join(", ");
      return `${s.name}: Overall ${s.percentage.toFixed(1)}%, Rank #${(s as any).rank}, Subjects: [${subjectDetails}], Absent: ${s.absent_count} exams`;
    }).join("\n");

    const totalStudents = studentPerformances.length;
    const avgPercentage = totalStudents > 0
      ? studentPerformances.reduce((a, s) => a + s.percentage, 0) / totalStudents
      : 0;
    const passCount = studentPerformances.filter(s => s.percentage >= 33).length;

    const prompt = `You are an educational analyst. Analyze these student marks for a section and provide detailed insights.

Section Data:
- Total students: ${totalStudents}
- Average percentage: ${avgPercentage.toFixed(1)}%
- Pass rate (>=33%): ${((passCount / totalStudents) * 100).toFixed(0)}%
- Subjects: ${[...new Set(exams.map((e: any) => e.subject))].join(", ")}

Student Performance:
${performanceSummary}

Provide analysis in this EXACT JSON format:
{
  "section_summary": {
    "average": ${avgPercentage.toFixed(1)},
    "highest": ${studentPerformances[0]?.percentage.toFixed(1) || 0},
    "lowest": ${studentPerformances[studentPerformances.length - 1]?.percentage.toFixed(1) || 0},
    "pass_rate": ${((passCount / totalStudents) * 100).toFixed(0)}
  },
  "student_reports": [
    {
      "name": "Student Name",
      "percentage": 85.5,
      "rank": 1,
      "grade": "A+",
      "status": "Pass",
      "strengths": ["Strong in Mathematics", "Consistent performer"],
      "weaknesses": ["Needs improvement in English"],
      "suggestions": ["Focus on creative writing", "Practice essay questions"]
    }
  ],
  "section_recommendations": ["Overall the section...", "Suggestion 1...", "Suggestion 2..."]
}

GRADING SCALE: A+ (>=90%), A (>=80%), B+ (>=70%), B (>=60%), C+ (>=50%), C (>=40%), D (>=33%), F (<33%).
Status: "Pass" if >=33%, "Fail" if <33%.
Include ALL ${totalStudents} students in student_reports array.
Provide 2-3 strengths, 1-2 weaknesses, and 2-3 actionable suggestions per student.
Provide 3-5 section-level recommendations.
Return ONLY valid JSON, no markdown.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert educational analyst. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      // Fallback: generate basic analysis without AI
      analysis = {
        section_summary: {
          average: avgPercentage,
          highest: studentPerformances[0]?.percentage || 0,
          lowest: studentPerformances[studentPerformances.length - 1]?.percentage || 0,
          pass_rate: (passCount / totalStudents) * 100,
        },
        student_reports: studentPerformances.map(s => ({
          name: s.name,
          percentage: s.percentage,
          rank: (s as any).rank,
          grade: s.percentage >= 90 ? "A+" : s.percentage >= 80 ? "A" : s.percentage >= 70 ? "B+" :
            s.percentage >= 60 ? "B" : s.percentage >= 50 ? "C+" : s.percentage >= 40 ? "C" :
            s.percentage >= 33 ? "D" : "F",
          status: s.percentage >= 33 ? "Pass" : "Fail",
          strengths: ["Data available"],
          weaknesses: s.percentage < 50 ? ["Needs improvement"] : [],
          suggestions: ["Review weak subjects"],
        })),
        section_recommendations: ["Review underperforming subjects", "Conduct remedial classes for failing students"],
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-student-marks error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
