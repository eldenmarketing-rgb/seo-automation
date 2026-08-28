const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

sb.from("keyword_clusters").select("site_key, status").then(({data, error}) => {
  if (error) { console.log("Error:", error.message); return; }
  const counts = {};
  for (const r of data) {
    const key = r.site_key + "|" + r.status;
    counts[key] = (counts[key] || 0) + 1;
  }
  const sites = {};
  for (const [k, v] of Object.entries(counts)) {
    const parts = k.split("|");
    const site = parts[0];
    const status = parts[1];
    if (sites[site] === undefined) sites[site] = {};
    sites[site][status] = v;
  }
  for (const [site, statuses] of Object.entries(sites).sort()) {
    const parts = Object.entries(statuses).sort().map(([s, c]) => s + ": " + c);
    console.log(site + " => " + parts.join(", "));
  }
});
