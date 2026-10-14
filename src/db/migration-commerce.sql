-- ─── Module commerce des sites CMS (template ecom-starter) ─────────────────
-- Décision du 2026-10-14 : les boutiques en ligne du réseau (panier + paiement
-- Stripe Checkout) vivent dans la base partagée, filtrées par site_key comme
-- `products`. Les sites appartiennent à Elden (pas de locataire) : l'espace
-- `/admin` de chaque site écrit ici avec la clé de service.
--
-- Règles :
--   • tout produit vendable porte ≥ 1 variante (`product_variants`) ; une ligne
--     de panier ou de commande référence TOUJOURS une variante, jamais le
--     produit seul. `products.price` reste un affichage de repli.
--   • la clé anon lit les variantes `published`, rien d'autre : commandes,
--     lignes, compteurs et événements webhook ne passent que par la clé de
--     service (serveur du site). Aucune politique anon = aucune lecture.
--   • le stock se décrémente dans le webhook Stripe, atomiquement, par
--     `claim_stock` ; `stock IS NULL` = non suivi (toujours disponible).
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-commerce.sql

-- ─── Variantes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- « Standard », « M / Noir », « 70 cl »…
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  sku TEXT CHECK (sku IS NULL OR char_length(sku) <= 60),
  -- Axes de déclinaison : {"Taille":"M","Couleur":"Noir"} — le sélecteur de la
  -- fiche produit déduit ses axes de l'union des clés.
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  -- Prix barré (affiché seulement s'il dépasse `price`).
  compare_at_price NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  -- NULL = stock non suivi.
  stock INT CHECK (stock IS NULL OR stock >= 0),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  -- Photo propre à la variante (sinon celles du produit).
  image TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_site ON product_variants(site_key);

COMMENT ON TABLE product_variants IS
  'Déclinaisons vendables des produits (template ecom-starter) — une ligne de commande référence toujours une variante.';

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon reads published variants" ON product_variants;
CREATE POLICY "anon reads published variants" ON product_variants
  FOR SELECT TO anon USING (status = 'published');

-- ─── Numérotation des commandes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_counters (
  site_key TEXT NOT NULL,
  year INT NOT NULL,
  last INT NOT NULL DEFAULT 0,
  PRIMARY KEY (site_key, year)
);
ALTER TABLE order_counters ENABLE ROW LEVEL SECURITY;

-- « CMD-2026-00042 » : lisible au téléphone, par site et par année.
CREATE OR REPLACE FUNCTION next_order_number(p_site_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM NOW())::INT;
  v_last INT;
BEGIN
  INSERT INTO order_counters (site_key, year, last)
  VALUES (p_site_key, v_year, 1)
  ON CONFLICT (site_key, year) DO UPDATE SET last = order_counters.last + 1
  RETURNING last INTO v_last;
  RETURN 'CMD-' || v_year || '-' || LPAD(v_last::TEXT, 5, '0');
END;
$$;
REVOKE ALL ON FUNCTION next_order_number(TEXT) FROM PUBLIC, anon;

-- ─── Commandes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  number TEXT NOT NULL,
  -- pending (session Stripe ouverte) → paid → shipped → delivered ;
  -- cancelled (expirée, échec, stock insuffisant, annulée par l'admin) ; refunded.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  email TEXT,
  phone TEXT,
  customer_name TEXT,
  -- Adresse telle que Stripe la renvoie (line1, line2, postal_code, city, country).
  shipping_address JSONB,
  shipping_method TEXT,
  shipping_cents INT NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  discount_code TEXT,
  discount_cents INT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  subtotal_cents INT NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  total_cents INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'eur',
  stripe_checkout_id TEXT,
  stripe_payment_intent TEXT,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  -- Note interne de l'admin (numéro de suivi, remarque).
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_key, number)
);

CREATE INDEX IF NOT EXISTS idx_orders_site_status ON orders(site_key, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_checkout ON orders(stripe_checkout_id);

COMMENT ON TABLE orders IS
  'Commandes des boutiques (template ecom-starter) — écrites par le checkout et le webhook Stripe du site, clé de service seulement.';

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  -- Instantané au moment de la commande : la fiche peut changer ensuite.
  product_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  unit_cents INT NOT NULL CHECK (unit_cents >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  image TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ─── Idempotence des webhooks (même mécanique que Luvala) ──────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  site_key TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ─── Stock atomique ────────────────────────────────────────────────────────
-- Décrémente le stock d'une variante ; lève STOCK_UNAVAILABLE si insuffisant.
-- Une variante au stock NULL n'est pas suivie : la fonction ne touche à rien.
CREATE OR REPLACE FUNCTION claim_stock(p_variant_id UUID, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_stock INT;
  v_tracked BOOLEAN;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'INVALID_QTY' USING ERRCODE = 'P0001';
  END IF;

  SELECT stock IS NOT NULL INTO v_tracked FROM product_variants WHERE id = p_variant_id;
  IF v_tracked IS NULL THEN
    RAISE EXCEPTION 'VARIANT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_tracked THEN
    RETURN NULL;
  END IF;

  UPDATE product_variants
     SET stock = stock - p_qty,
         updated_at = NOW()
   WHERE id = p_variant_id
     AND stock >= p_qty
  RETURNING stock INTO v_stock;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'STOCK_UNAVAILABLE' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_stock;
END;
$$;

-- Rend du stock (annulation, remboursement). Sans effet sur un stock non suivi.
CREATE OR REPLACE FUNCTION release_stock(p_variant_id UUID, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_stock INT;
BEGIN
  UPDATE product_variants
     SET stock = stock + GREATEST(p_qty, 0),
         updated_at = NOW()
   WHERE id = p_variant_id
     AND stock IS NOT NULL
  RETURNING stock INTO v_stock;
  RETURN v_stock;
END;
$$;

REVOKE ALL ON FUNCTION claim_stock(UUID, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION release_stock(UUID, INT) FROM PUBLIC, anon;
