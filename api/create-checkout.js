// ══════════════════════════════════════════════════════════════
//  OIBASE — Stripe Checkout starten
// ══════════════════════════════════════════════════════════════
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRIJZEN = {
  Basis:      { basis: process.env.PRICE_BASIS_BASIS,      perMw: process.env.PRICE_BASIS_PERMW },
  Premium:    { basis: process.env.PRICE_PREMIUM_BASIS,    perMw: process.env.PRICE_PREMIUM_PERMW },
  Enterprise: { basis: process.env.PRICE_ENTERPRISE_BASIS, perMw: process.env.PRICE_ENTERPRISE_PERMW },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { plan, aantalMedewerkers, bedrijfId, email, origin } = req.body || {};
    const p = PRIJZEN[plan];
    if (!p || !p.basis) {
      res.status(400).json({ error: 'Onbekend plan of ontbrekende prijs-configuratie.' });
      return;
    }
    const qty = Math.max(1, parseInt(aantalMedewerkers, 10) || 1);
    const base = origin || req.headers.origin || 'https://oibase.nl';

    const line_items = [{ price: p.basis, quantity: 1 }];
    if (p.perMw) line_items.push({ price: p.perMw, quantity: qty });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items,
      subscription_data: { trial_period_days: 14 },
      client_reference_id: bedrijfId || undefined,
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: base + '/?abonnement=actief',
      cancel_url:  base + '/?abonnement=geannuleerd',
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('create-checkout fout:', e);
    res.status(500).json({ error: e.message });
  }
}
