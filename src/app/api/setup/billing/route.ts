import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ message: "Billing setup disabled: missing Supabase env." });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    // 1. Create Subscriptions Table if not exists
    const { error } = await supabase.rpc('create_subscriptions_table');
    
    // If RPC doesn't exist (likely), we might need to use direct SQL via a Dashboard or raw query if enabled.
    // Since we are on client-side Supabase mostly, we'll try to use a "query" table approach or assume it exists.
    
    // FOR THIS DEMO: We will assume the 'profiles' or 'users' table exists and we just need to ensuring it has a 'plan' column.
    // However, Supabase Auth users are in auth.users which we can't easily modify from here without Service Role.
    // So we will create a public 'profiles' table linked to auth.users.

    /* 
    -- SQL TO RUN IN SUPABASE SQL EDITOR --
    create table if not exists public.profiles (
      id uuid references auth.users on delete cascade primary key,
      email text,
      plan text default 'free', -- 'free', 'pro', 'enterprise'
      credits int default 0,
      updated_at timestamp with time zone default now()
    );
    alter table public.profiles enable row level security;
    create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
    create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
    create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);
    */

    return NextResponse.json({ 
        message: "Please run the SQL migration manually in Supabase Dashboard SQL Editor to enable Billing.",
        sql: `
            create table if not exists public.profiles (
              id uuid references auth.users on delete cascade primary key,
              email text,
              plan text default 'free',
              credits int default 0,
              updated_at timestamp with time zone default now()
            );
        `
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
