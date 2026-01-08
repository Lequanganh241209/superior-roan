export function parseNaturalLanguageToSQL(input: string): string {
    const text = input.toLowerCase();
    const tables: string[] = [];
    
    // Simple heuristic parser for demo purposes
    // "Create table users with name and email" -> Table: users, Fields: name, email
    
    // 1. Identify potential table definitions
    // Split by sentences or "and also" logic could be complex, simplifying to keyword detection
    
    // Detect "users" table intent
    if (text.includes("user") || text.includes("account") || text.includes("profile")) {
        tables.push(`CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);
    }

    // Detect "products" or "items"
    if (text.includes("product") || text.includes("item") || text.includes("good")) {
        tables.push(`CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;`);
    }

    // Detect "orders" or "transactions"
    if (text.includes("order") || text.includes("payment") || text.includes("checkout")) {
         tables.push(`CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- pending, paid, shipped
  total_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`);
    }

     // Detect "posts" or "articles"
     if (text.includes("post") || text.includes("article") || text.includes("blog")) {
        tables.push(`CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  content TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;`);
    }

    // Fallback if no specific keywords found but input exists
    if (tables.length === 0 && text.trim().length > 0) {
         tables.push(`-- Generic Table Structure inferred from input
CREATE TABLE generic_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
    }

    return `-- Auto-generated Migration
-- Based on prompt: "${input}"

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

${tables.join("\n\n")}`;
}

export function parseEntities(input: string): { tables: string[] } {
    const text = input.toLowerCase();
    const tables: string[] = [];
    if (text.includes("user") || text.includes("account") || text.includes("profile")) {
        tables.push("users");
    }
    if (text.includes("product") || text.includes("item") || text.includes("good")) {
        tables.push("products");
    }
    if (text.includes("order") || text.includes("payment") || text.includes("checkout")) {
        tables.push("orders");
    }
    if (text.includes("post") || text.includes("article") || text.includes("blog")) {
        tables.push("posts");
    }
    if (tables.length === 0 && text.trim().length > 0) {
        tables.push("generic_items");
    }
    return { tables };
}
