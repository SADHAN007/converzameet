-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions 
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own subscriptions" ON public.push_subscriptions 
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions 
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);