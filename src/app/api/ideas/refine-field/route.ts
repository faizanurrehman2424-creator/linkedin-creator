import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI(
  process.env.GOOGLE_CLOUD_PROJECT
    ? { vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' }
    : { apiKey: process.env.GEMINI_API_KEY }
);

export async function POST(request: Request) {
  try {
    const { fieldToRefine, currentText, userPrompt } = await request.json();

    if (!fieldToRefine || !currentText || !userPrompt) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompt = `
      You are an expert LinkedIn copywriter.
      I need you to refine a specific part of a LinkedIn post based on the user's instructions.
      
      Field being refined: ${fieldToRefine}
      Current text: "${currentText}"
      User's instruction: "${userPrompt}"
      
      RULES:
      1. Return ONLY the refined text. Do not include any conversational filler, markdown formatting (like \`\`\`), or explanations.
      2. DO NOT use any emojis.
      3. If the field is "hashtags", return them as a space-separated string (e.g. #Leadership #Innovation).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    if (!response.text) {
        throw new Error("Empty response from AI");
    }

    const refinedText = response.text.trim();

    return NextResponse.json({ success: true, refinedText });
  } catch (error: any) {
    console.error("AI Refine Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to refine field' }, { status: 500 });
  }
}
