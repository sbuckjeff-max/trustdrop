import express from 'express';
import type { ShippingMethod, ShippingRate } from '../types';

const router = express.Router();

interface RateConfig {
  label: string;
  carrier: string;
  estimated_days: string;
  base_rate_cents: number;
  per_gram_rate_cents: number;
}

const RATE_TABLE: Record<ShippingMethod, RateConfig> = {
  trustdrop: {
    label: 'TrustDrop Courier',
    carrier: 'TrustDrop',
    estimated_days: '1–2 days',
    base_rate_cents: 1200,
    per_gram_rate_cents: 0,
  },
  usps_priority: {
    label: 'USPS Priority Mail',
    carrier: 'USPS',
    estimated_days: '2–3 days',
    base_rate_cents: 895,
    per_gram_rate_cents: 0.002,
  },
  usps_ground: {
    label: 'USPS Ground Advantage',
    carrier: 'USPS',
    estimated_days: '3–5 days',
    base_rate_cents: 550,
    per_gram_rate_cents: 0.0015,
  },
  usps_express: {
    label: 'USPS Priority Mail Express',
    carrier: 'USPS',
    estimated_days: '1–2 days',
    base_rate_cents: 2695,
    per_gram_rate_cents: 0.003,
  },
  fedex_ground: {
    label: 'FedEx Ground',
    carrier: 'FedEx',
    estimated_days: '2–5 days',
    base_rate_cents: 1045,
    per_gram_rate_cents: 0.0025,
  },
  fedex_saver: {
    label: 'FedEx Express Saver',
    carrier: 'FedEx',
    estimated_days: '3 days',
    base_rate_cents: 1895,
    per_gram_rate_cents: 0.0035,
  },
  fedex_overnight: {
    label: 'FedEx Standard Overnight',
    carrier: 'FedEx',
    estimated_days: '1 day',
    base_rate_cents: 3495,
    per_gram_rate_cents: 0.005,
  },
  ups_ground: {
    label: 'UPS Ground',
    carrier: 'UPS',
    estimated_days: '2–5 days',
    base_rate_cents: 1045,
    per_gram_rate_cents: 0.0025,
  },
  ups_3day: {
    label: 'UPS 3 Day Select',
    carrier: 'UPS',
    estimated_days: '3 days',
    base_rate_cents: 1795,
    per_gram_rate_cents: 0.0035,
  },
  ups_next_day: {
    label: 'UPS Next Day Air',
    carrier: 'UPS',
    estimated_days: '1 day',
    base_rate_cents: 3595,
    per_gram_rate_cents: 0.005,
  },
};

function computeRate(method: ShippingMethod, weightGrams: number): number {
  const config = RATE_TABLE[method];
  const weight = Math.max(0, weightGrams ?? 0);
  const rate = config.base_rate_cents + weight * config.per_gram_rate_cents;
  return Math.round(rate);
}

// Public: get shipping rates for a listing's package
// Query: ?weight_grams=500 (optional, falls back to defaults)
router.get('/rates', async (req, res) => {
  try {
    const weightGrams = Number.parseFloat((req.query.weight_grams as string) ?? '') || 500;

    const rates: ShippingRate[] = (Object.keys(RATE_TABLE) as ShippingMethod[]).map((method) => {
      const config = RATE_TABLE[method];
      return {
        method,
        label: config.label,
        carrier: config.carrier,
        estimated_days: config.estimated_days,
        rate_cents: computeRate(method, weightGrams),
      };
    });

    // Group by carrier for easier frontend display
    res.json({ rates, weight_grams: weightGrams });
  } catch (error) {
    console.error('Shipping rates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
