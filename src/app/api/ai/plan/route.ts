
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60; // Set max duration for Vercel Function

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    
    // Nếu không có API KEY, trả về dữ liệu giả lập để test
    if (!process.env.OPENAI_API_KEY) {
        await new Promise(r => setTimeout(r, 2000)); // Fake delay
        return NextResponse.json({
            sql: `
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
            `,
            nodes: [
                { id: '1', type: 'custom', position: { x: 100, y: 100 }, data: { label: 'User Interface', type: 'frontend' } },
                { id: '2', type: 'custom', position: { x: 400, y: 100 }, data: { label: 'API Gateway', type: 'backend' } },
                { id: '3', type: 'custom', position: { x: 400, y: 300 }, data: { label: 'PostgreSQL DB', type: 'database' } }
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2', animated: true },
                { id: 'e2-3', source: '2', target: '3', animated: true }
            ],
            description: "System architecture generated in simulation mode."
        });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = `
    You are an Expert Software Architect. Analyze the user's project idea and output a JSON object with:
    1. "sql": A valid PostgreSQL migration script (CREATE TABLEs, RLS policies, Relations).
    2. "nodes": Array of React Flow nodes ({id, type='custom', position, data: {label, type: 'frontend'|'backend'|'database'}}).
    3. "edges": Array of React Flow edges ({id, source, target}).
    4. "description": A short technical summary.
    
    Keep the architecture simple but complete.
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content from OpenAI");

    const plan = JSON.parse(content);

    return NextResponse.json(plan);

  } catch (error: any) {
    console.error("Plan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
