import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_HIDDEN_CATEGORIES = [
  'Portal Evangélico',
  'Notícias Evangélicas',
  'Portal Evangelico',
  'Noticias Evangelicas',
  'Portal EvangÃ©lico',
  'NotÃ­cias EvangÃ©licas',
];

const ADMIN_EMAIL_ALLOWLIST = new Set(
  (Deno.env.get('RECON_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const ALLOW_AUTHENTICATED_ADMIN_ACTIONS =
  (Deno.env.get('RECON_ALLOW_AUTHENTICATED_ADMIN_ACTIONS') ?? 'true')
    .trim()
    .toLowerCase() === 'true';

function getHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function hasAdminLikeRole(roleCandidates: unknown[]): boolean {
  const normalized = roleCandidates
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean);

  return normalized.includes('admin') || normalized.includes('service_role');
}

async function isAuthorizedAdminCaller(
  req: Request,
  supabase: ReturnType<typeof createClient>,
): Promise<boolean> {
  const token = getBearerToken(req);
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  const claimRole = String(payload?.role ?? '').toLowerCase();
  const claimAppMetadata = (payload?.app_metadata as Record<string, unknown> | undefined) ?? {};
  const claimUserMetadata = (payload?.user_metadata as Record<string, unknown> | undefined) ?? {};

  if (hasAdminLikeRole([claimRole, claimAppMetadata.role, claimUserMetadata.role])) {
    return true;
  }

  if (claimRole !== 'authenticated') {
    return false;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return false;
  }

  const user = data.user;
  const email = (user.email ?? '').toLowerCase();

  if (hasAdminLikeRole([user.app_metadata?.role, user.user_metadata?.role])) {
    return true;
  }

  if (ADMIN_EMAIL_ALLOWLIST.size > 0) {
    return email !== '' && ADMIN_EMAIL_ALLOWLIST.has(email);
  }

  return ALLOW_AUTHENTICATED_ADMIN_ACTIONS;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? Deno.env.get('RECON_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('RECON_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const isAuthorized = await isAuthorizedAdminCaller(req, supabase);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized caller' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const mode = String(body.mode ?? body.action ?? 'country_cleanup').toLowerCase();

    if (mode === 'cleanup_old_articles' || mode === 'cleanup_old_articles_rpc') {
      const { data, error } = await supabase.rpc('cleanup_old_articles');
      if (error) {
        return new Response(
          JSON.stringify({ success: false, mode, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const deleted = typeof data === 'number' ? data : Number(data ?? 0);
      return new Response(
        JSON.stringify({ success: true, mode, deleted, message: `${deleted} artigos removidos` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (mode === 'remove_hidden_categories' || mode === 'cleanup_categories') {
      const categoriesFromBody = Array.isArray(body.categories)
        ? body.categories.map((value) => String(value).trim()).filter(Boolean)
        : [];
      const categories =
        categoriesFromBody.length > 0 ? categoriesFromBody : DEFAULT_HIDDEN_CATEGORIES;

      const { error, count } = await supabase
        .from('articles')
        .delete({ count: 'exact' })
        .in('category', categories);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, mode, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode,
          categories,
          deleted: count ?? 0,
          message: `${count ?? 0} artigos removidos`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const tld = (Deno.env.get('RECON_COUNTRY_ONLY') || 'BR').toUpperCase();
    const suffix = tld === 'BR' ? '.br' : `.${tld.toLowerCase()}`;

    const { data: articles, error } = await supabase
      .from('articles')
      .select('id,url')
      .limit(5000);

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    const toDeleteIds: string[] = [];
    for (const a of articles || []) {
      const host = getHost(a.url);
      if (host && !host.endsWith(suffix)) {
        toDeleteIds.push(a.id as unknown as string);
      }
    }

    let deleted = 0;
    if (toDeleteIds.length > 0) {
      const { error: delErr, count } = await supabase
        .from('articles')
        .delete({ count: 'exact' })
        .in('id', toDeleteIds);
      if (delErr) {
        return new Response(JSON.stringify({ success: false, error: delErr.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }
      deleted = count || toDeleteIds.length;
    }

    return new Response(
      JSON.stringify({ success: true, mode: 'country_cleanup', checked: (articles || []).length, deleted, tld }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});

