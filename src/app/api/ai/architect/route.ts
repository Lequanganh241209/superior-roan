import { NextResponse } from "next/server";
import OpenAI from "openai";

// Simulation Core: Pre-defined templates for fallback when no API key is present
const TEMPLATES: Record<string, any> = {
  ecommerce: {
    sql: `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- E-commerce Schema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, shipped
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `,
    nodes: [
      { id: 'user-entry', type: 'input', label: 'Customer Visit', x: 250, y: 0, style: { background: '#10b981', color: 'white' } },
      { id: 'auth', type: 'default', label: 'Auth Middleware', x: 250, y: 100 },
      { id: 'products', type: 'default', label: 'Browse Products', x: 100, y: 200 },
      { id: 'cart', type: 'default', label: 'Add to Cart', x: 400, y: 200 },
      { id: 'checkout', type: 'output', label: 'Payment Gateway', x: 250, y: 300, style: { background: '#f59e0b', color: 'white' } },
    ],
    edges: [
      { id: 'e1', source: 'user-entry', target: 'auth', animated: true },
      { id: 'e2', source: 'auth', target: 'products' },
      { id: 'e3', source: 'products', target: 'cart' },
      { id: 'e4', source: 'cart', target: 'checkout', animated: true },
    ]
  },
  blog: {
    sql: `
-- Blog/CMS Schema
CREATE TABLE authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES authors(id),
  title TEXT NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `,
    nodes: [
      { id: 'visitor', type: 'input', label: 'Reader Visit', x: 250, y: 0 },
      { id: 'list', type: 'default', label: 'Post List (SSR)', x: 250, y: 100 },
      { id: 'detail', type: 'default', label: 'Post Detail', x: 250, y: 200 },
      { id: 'cms', type: 'output', label: 'Admin CMS', x: 500, y: 100, style: { background: '#6366f1', color: 'white' } },
    ],
    edges: [
      { id: 'e1', source: 'visitor', target: 'list', animated: true },
      { id: 'e2', source: 'list', target: 'detail' },
      { id: 'e3', source: 'cms', target: 'list', animated: true, label: 'Publish' },
    ]
  },
  default: {
    sql: `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- General Project Schema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `,
    nodes: [
      { id: 'start', type: 'input', label: 'Start', x: 250, y: 0 },
      { id: 'process', type: 'default', label: 'Process', x: 250, y: 100 },
      { id: 'end', type: 'output', label: 'End', x: 250, y: 200 },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'process', animated: true },
      { id: 'e2', source: 'process', target: 'end' },
    ]
  }
};

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    // 1. AI MODE: If Key exists, use GPT-4
    if (apiKey) {
      const openai = new OpenAI({ apiKey });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are Aether Architect, an elite software architect AI. 
            Analyze the user's project prompt and generate a JSON response containing:
            1. 'sql': A valid PostgreSQL schema creation script.
            2. 'nodes': An array of ReactFlow nodes (id, type, label, x, y, style?).
            3. 'edges': An array of ReactFlow edges (id, source, target, animated?).
            
            Focus on creating a logical flow and a robust database schema.`
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return NextResponse.json(result);
    }

    // 2. SIMULATION MODE: Fallback to smart templates
    // Simple keyword matching
    const lowerPrompt = prompt.toLowerCase();
    let template = TEMPLATES.default;

    if (lowerPrompt.includes('shop') || lowerPrompt.includes('store') || lowerPrompt.includes('ecommerce') || lowerPrompt.includes('bán hàng')) {
      template = TEMPLATES.ecommerce;
    } else if (lowerPrompt.includes('blog') || lowerPrompt.includes('news') || lowerPrompt.includes('cms') || lowerPrompt.includes('tin tức')) {
      template = TEMPLATES.blog;
    }

    // Simulate "thinking" time for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json(template);

  } catch (error: any) {
    console.error("AI Architect Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
