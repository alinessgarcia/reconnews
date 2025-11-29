import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? Deno.env.get('RECON_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('RECON_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    return new Response(JSON.stringify({ success: true, checked: (articles || []).length, deleted, tld }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});

