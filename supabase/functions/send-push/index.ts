import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Minimal VAPID-signed Web Push sender (no npm deps needed in edge functions)
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = 'mailto:https://kajsaeklof.github.io/med-tracker/';

Deno.serve(async (req) => {
    const { user_ids, title, body, tag, data } = await req.json();

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch subscriptions for the target users
    const { data: rows } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .in('user_id', user_ids);

    if (!rows?.length) return new Response('No subscribers', { status: 200 });

    const payload = JSON.stringify({ title, body, tag, data });

    // Send to each subscription using the web-push library via esm.sh
    const { default: webpush } = await import('https://esm.sh/web-push@3.6.7');
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    await Promise.allSettled(
        rows.map(row => webpush.sendNotification(row.subscription, payload))
    );

    return new Response('Sent', { status: 200 });
});