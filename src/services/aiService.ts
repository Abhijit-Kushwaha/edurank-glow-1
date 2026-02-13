const BYTEZ_API_KEY = import.meta.env.VITE_BYTEZ_API_KEY;
const BYTEZ_API_BASE = 'https://api.bytez.ai/v1';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface AINotesResponse {
  title: string;
  explanation: string;
  keyPoints: string[];
  summary: string;
  formula?: string[];
  revisionTips: string;
}

export interface CodingResponse {
  code: string;
  explanation: string;
  optimization?: string;
  alternatives?: string[];
}

const Models = {
  QUIZ_NOTES: 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
  CODING: 'moonshotai/Kimi-K2-Instruct-0905',
};

/**
 * Call Bytez AI API with streaming support
 */
async function callBytezAPI(
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  try {
    if (!BYTEZ_API_KEY) {
      throw new Error('Bytez API key not configured');
    }

    const response = await fetch(`${BYTEZ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BYTEZ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Bytez API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Bytez API error:', error);
    throw error;
  }
}

/**
 * Helper: Generate fallback quiz questions
 */
function generateQuizFallback(topic: string, numQuestions: number): QuizQuestion[] {
  const fallbackQuestions: QuizQuestion[] = [];
  for (let i = 0; i < numQuestions; i++) {
    fallbackQuestions.push({
      question: `What is a key concept about ${topic}? (Question ${i + 1})`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: Math.floor(Math.random() * 4),
      explanation: 'This is a sample question. Please regenerate.',
    });
  }
  return fallbackQuestions;
}

/**
 * Helper: Generate fallback notes
 */
function generateNotesFallback(topic: string): AINotesResponse {
  return {
    title: topic,
    explanation: `Study notes for ${topic}. Please regenerate or rephrase your query.`,
    keyPoints: ['Key concept 1', 'Key concept 2', 'Key concept 3'],
    summary: `Quick revision of ${topic}`,
    revisionTips: 'Review the key points for better retention',
  };
}

/**
 * Helper: Generate fallback code
 */
function generateCodeFallback(language: string, problem: string): CodingResponse {
  return {
    code: `// ${language} solution for: ${problem}\n// Please regenerate or rephrase your query.`,
    explanation: 'Code generation fallback',
    optimization: 'Try rephrasing your coding problem',
  };
}

export const bytezService = {
  /**
   * Generate MCQ quiz questions
   */
  async generateQuiz(topic: string, numQuestions: number = 10): Promise<QuizQuestion[]> {
    const prompt = `You are an expert educator. Generate EXACTLY ${numQuestions} multiple choice questions on "${topic}".

For EACH question, provide JSON in this exact format:
{
  "question": "Question text?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Why this answer is correct"
}

Return ONLY a JSON array, one object per line. No markdown, no code blocks.`;

    try {
      const response = await callBytezAPI(Models.QUIZ_NOTES, prompt);

      const questions: QuizQuestion[] = [];
      const lines = response.trim().split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          try {
            questions.push(JSON.parse(line));
          } catch (e) {
            console.error('Failed to parse question JSON:', e);
          }
        }
      }

      return questions.length > 0 ? questions : generateQuizFallback(topic, numQuestions);
    } catch (error) {
      console.error('Error generating quiz:', error);
      return generateQuizFallback(topic, numQuestions);
    }
  },

  /**
   * Generate AI notes for a topic
   */
  async generateNotes(topic: string): Promise<AINotesResponse> {
    const prompt = `You are an expert tutor. Create comprehensive study notes for "${topic}".

Format your response EXACTLY like this (JSON):
{
  "title": "Topic Title",
  "explanation": "Paragraph explaining the topic in simple terms",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],
  "summary": "Brief summary for revision",
  "formula": ["Formula 1 if applicable", "Formula 2 if applicable"],
  "revisionTips": "Quick revision tips for this topic"
}

Return ONLY valid JSON, no markdown or code blocks.`;

    try {
      const response = await callBytezAPI(Models.QUIZ_NOTES, prompt);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return generateNotesFallback(topic);
    } catch (error) {
      console.error('Error generating notes:', error);
      return generateNotesFallback(topic);
    }
  },

  /**
   * Explain a concept in simple terms
   */
  async explainConcept(concept: string): Promise<string> {
    const prompt = `Explain "${concept}" in simple, easy-to-understand terms suitable for a student. Be concise but thorough.`;

    try {
      return await callBytezAPI(Models.QUIZ_NOTES, prompt);
    } catch (error) {
      console.error('Error explaining concept:', error);
      throw error;
    }
  },

  /**
   * Generate code for a programming problem
   */
  async generateCode(
    language: string,
    problem: string
  ): Promise<CodingResponse> {
    const prompt = `You are an expert coding assistant. 

Language: ${language}
Problem: ${problem}

Provide response in this JSON format:
{
  "code": "Clean, well-commented code solution",
  "explanation": "Step-by-step explanation of the code",
  "optimization": "Performance optimization tips",
  "alternatives": ["Alternative approach 1", "Alternative approach 2"]
}

Return ONLY valid JSON, no markdown or code blocks.`;

    try {
      const response = await callBytezAPI(Models.CODING, prompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return generateCodeFallback(language, problem);
    } catch (error) {
      console.error('Error generating code:', error);
      return generateCodeFallback(language, problem);
    }
  },

  /**
   * Debug code and suggest fixes
   */
  async debugCode(language: string, code: string, error: string): Promise<string> {
    const prompt = `Debug this ${language} code and provide fixes.

Code:\n${code}

Error:\n${error}

Provide:
1. Root cause
2. Fix
3. Prevention tips`;

    try {
      return await callBytezAPI(Models.CODING, prompt);
    } catch (error) {
      console.error('Error debugging code:', error);
      throw error;
    }
  },

  /**
   * Solve a doubt or answer a question
   */
  async solveDou(question: string, subject?: string): Promise<string> {
    const systemPrompt = subject
      ? `You are an expert tutor in ${subject}. Answer student questions clearly and thoroughly.`
      : 'You are a helpful tutor. Answer questions clearly and thoroughly.';

    try {
      return await callBytezAPI(Models.QUIZ_NOTES, question, systemPrompt);
    } catch (error) {
      console.error('Error solving doubt:', error);
      throw error;
    }
  },
};
