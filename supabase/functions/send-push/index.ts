import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

function base64UrlDecode(base64: string): Uint8Array {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const b64 = base64.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidHeaders(audience: string): Promise<Record<string, string>> {
    const now = Math.floor(Date.now() / 1000);
    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT };

    const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const keyData = base64UrlDecode(VAPID_PRIVATE_KEY);
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyData,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        new TextEncoder().encode(signingInput)
    );

    const token = `${signingInput}.${base64UrlEncode(signature)}`;
    return {
        'Authorization': `vapid t=${token}, k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
    };
}

async function sendPushNotification(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string): Promise<void> {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const headers = await buildVapidHeaders(audience);

    // Encrypt the payload using the subscription's public key
    const authSecret = base64UrlDecode(subscription.keys.auth);
    const clientPublicKey = base64UrlDecode(subscription.keys.p256dh);

    const serverKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );

    const serverPublicKey = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
    const clientKey = await crypto.subtle.importKey(
        'raw', clientPublicKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        false, []
    );

    const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: clientKey },
        serverKeyPair.privateKey, 256
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hkdf = async (ikm: ArrayBuffer, salt: Uint8Array, info: Uint8Array, length: number) => {
        const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
        return crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
    };

    const prk = await hkdf(
        sharedSecret,
        authSecret,
        new TextEncoder().encode('Content-Encoding: auth\0'),
        32
    );

    const context = new Uint8Array([
        ...new TextEncoder().encode('P-256\0'),
        0, 65, ...new Uint8Array(clientPublicKey),
        0, 65, ...new Uint8Array(serverPublicKey),
    ]);

    const contentEncryptionKey = await hkdf(prk, salt,
        new Uint8Array([...new TextEncoder().encode('Content-Encoding: aesgcm\0'), ...context]), 16);
    const nonce = await hkdf(prk, salt,
        new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), ...context]), 12);

    const aesKey = await crypto.subtle.importKey('raw', contentEncryptionKey, 'AES-GCM', false, ['encrypt']);
    const encodedPayload = new TextEncoder().encode(payload);
    const paddedPayload = new Uint8Array(encodedPayload.length + 2);
    paddedPayload.set(encodedPayload, 2);

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        aesKey,
        paddedPayload
    );

    const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
            ...headers,
            'Encryption': `salt=${base64UrlEncode(salt)}`,
            'Crypto-Key': `dh=${base64UrlEncode(serverPublicKey)};vapid=${VAPID_PUBLIC_KEY}`,
        },
        body: encrypted,
    });

    if (!response.ok) {
        throw new Error(`Push failed: ${response.status} ${await response.text()}`);
    }
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const { user_ids, title, body, tag, data } = await req.json();
    if (!user_ids?.length) return new Response('No user_ids provided', { status: 400 });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: rows, error } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .in('user_id', user_ids);

    if (error) return new Response('DB error', { status: 500 });
    if (!rows?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

    const payload = JSON.stringify({ title, body, tag, data });

    const results = await Promise.allSettled(
        rows.map(row => sendPushNotification(row.subscription, payload))
    );

    results.forEach((result, i) => {
      if (result.status === 'rejected') {
          console.error(`Failed ${i}:`, result.reason?.message ?? result.reason);
      } else {
          console.log(`Success ${i}`);
      }
    });;

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ sent: successCount, total: rows.length }), {
        headers: { 'Content-Type': 'application/json' }
    });
});