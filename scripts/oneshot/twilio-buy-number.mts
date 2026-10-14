/**
 * Achat d'un numéro Twilio local français (zone Perpignan : 04 68 / 04 48 en repli).
 * Jetable. Lit TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (ou TWILIO_API_KEY/TWILIO_API_SECRET) dans .env.
 *   npx tsx scripts/oneshot/twilio-buy-number.mts                 → simulation : bundles, adresses, numéros dispos
 *   npx tsx scripts/oneshot/twilio-buy-number.mts --buy=+33468xxxxxx --friendly="Plaquiste 66"
 */
import 'dotenv/config';

const SID = process.env.TWILIO_ACCOUNT_SID;
const user = process.env.TWILIO_API_KEY ?? SID;
const pass = process.env.TWILIO_API_SECRET ?? process.env.TWILIO_AUTH_TOKEN;
if (!SID || !user || !pass) throw new Error('TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (ou API key/secret) manquants dans .env');
const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
const API = `https://api.twilio.com/2010-04-01/Accounts/${SID}`;
const NUMBERS = 'https://numbers.twilio.com/v2';

async function get(url: string) {
  const r = await fetch(url, { headers: { Authorization: auth } });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${url}\n${JSON.stringify(j)}`);
  return j;
}
async function post(url: string, body: Record<string, string>) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${url}\n${JSON.stringify(j)}`);
  return j;
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || 'true']; }));

// 1. Bundles réglementaires (obligatoire en France) + adresses
const bundles = (await get(`${NUMBERS}/RegulatoryCompliance/Bundles?IsoCountry=FR&PageSize=50`)).results as Array<{ sid: string; friendly_name: string; status: string; number_type: string; end_user_type: string }>;
console.log('Bundles FR :');
for (const b of bundles) console.log(`  ${b.sid}  ${(b.status ?? "").padEnd(18)} ${(b.number_type ?? "-").padEnd(8)} ${(b.end_user_type ?? "-").padEnd(10)} ${b.friendly_name}`);
const addresses = (await get(`${API}/Addresses.json?PageSize=50`)).addresses as Array<{ sid: string; customer_name: string; city: string; iso_country: string; validated: boolean }>;
console.log('Adresses :');
for (const a of addresses) console.log(`  ${a.sid}  ${a.iso_country} ${(a.city ?? "").padEnd(14)} validée=${a.validated} ${a.customer_name}`);

// Type Twilio du numéro : 09 = national, 01-05 = local, 06/07 = mobile. Le bundle doit porter la même régulation.
const wantedType = args.buy ? (/^\+339/.test(String(args.buy)) ? 'national' : /^\+33[67]/.test(String(args.buy)) ? 'mobile' : 'local') : 'national';
let bundle: { sid: string; friendly_name: string } | undefined;
for (const b of bundles) {
  if (b.status !== 'twilio-approved') continue;
  const d = await get(`${NUMBERS}/RegulatoryCompliance/Bundles/${b.sid}`);
  const reg = await get(`${NUMBERS}/RegulatoryCompliance/Regulations/${d.regulation_sid}`);
  if (reg.number_type === wantedType) { bundle = b; break; }
}
// Adresse : celle d'un numéro déjà acheté avec ce bundle, sinon la première adresse FR
const owned = (await get(`${API}/IncomingPhoneNumbers.json?PageSize=50`)).incoming_phone_numbers as Array<{ bundle_sid?: string; address_sid?: string }>;
const adSid = owned.find((n) => n.bundle_sid === bundle?.sid)?.address_sid ?? addresses.find((a) => a.iso_country === 'FR')?.sid;
const address = adSid ? { sid: adSid } : undefined;
console.log(`\nType voulu=${wantedType} → bundle=${bundle?.friendly_name ?? 'AUCUN'} adresse=${adSid ?? 'AUCUNE'}`);

// 2. Numéros disponibles, zone Perpignan d'abord
const found: Array<{ phone_number: string; friendly_name: string; locality: string; region: string }> = [];
for (const prefix of ['+33468', '+33448', '+334']) {
  const r = await get(`${API}/AvailablePhoneNumbers/FR/Local.json?Contains=${encodeURIComponent(prefix + '*')}&VoiceEnabled=true&PageSize=20`);
  const list = r.available_phone_numbers ?? [];
  console.log(`\nDisponibles ${prefix}… : ${list.length}`);
  for (const n of list) console.log(`  ${n.phone_number}  ${n.friendly_name}  ${n.locality ?? ''} ${n.region ?? ''}`);
  found.push(...list);
  if (list.length) break;
}

// 3. Achat explicite seulement
if (!args.buy) { console.log('\nSimulation terminée. Relancer avec --buy=+33… pour acheter.'); process.exit(0); }
if (!bundle) throw new Error('Aucun bundle local FR approuvé — Twilio refusera l’achat.');
if (!address) throw new Error('Aucune adresse FR sur le compte — Twilio refusera l’achat.');
const bought = await post(`${API}/IncomingPhoneNumbers.json`, {
  PhoneNumber: String(args.buy),
  FriendlyName: String(args.friendly ?? 'Plaquiste Perpignan'),
  BundleSid: bundle.sid,
  AddressSid: address.sid,
});
console.log(`\n✅ Acheté : ${bought.phone_number}  sid=${bought.sid}  bundle=${bundle.sid}  adresse=${address.sid}`);
