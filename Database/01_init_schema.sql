-- MedTracker Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create children table
CREATE TABLE children (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    -- weight DECIMAL(5,2), -- in kg
    -- age DECIMAL(4,2), -- in years
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    shared_with UUID[], -- array of user IDs who have access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create doses table
CREATE TABLE doses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
    medication TEXT NOT NULL CHECK (medication IN ('paracetamol', 'ibuprofen')),
    amount DECIMAL(6,2) NOT NULL,
    unit TEXT DEFAULT 'ml',
    given_at TIMESTAMP WITH TIME ZONE NOT NULL,
    given_by UUID REFERENCES profiles(id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX idx_children_created_by ON children(created_by);
CREATE INDEX idx_children_shared_with ON children USING GIN(shared_with);
CREATE INDEX idx_doses_child_id ON doses(child_id);
CREATE INDEX idx_doses_given_at ON doses(given_at DESC);
CREATE INDEX idx_doses_medication ON doses(medication);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for children table
CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE doses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Children policies
CREATE POLICY "Users can view their own children and shared children"
    ON children FOR SELECT
    USING (
        created_by = auth.uid() 
        OR auth.uid() = ANY(shared_with)
    );

CREATE POLICY "Users can create children"
    ON children FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own children"
    ON children FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own children"
    ON children FOR DELETE
    USING (created_by = auth.uid());

-- Doses policies
CREATE POLICY "Users can view doses for accessible children"
    ON doses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = doses.child_id
            AND (children.created_by = auth.uid() OR auth.uid() = ANY(children.shared_with))
        )
    );

CREATE POLICY "Users can create doses for accessible children"
    ON doses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = child_id
            AND (children.created_by = auth.uid() OR auth.uid() = ANY(children.shared_with))
        )
        AND given_by = auth.uid()
    );

CREATE POLICY "Users can update their own doses"
    ON doses FOR UPDATE
    USING (given_by = auth.uid());

CREATE POLICY "Users can delete their own doses"
    ON doses FOR DELETE
    USING (given_by = auth.uid());

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;