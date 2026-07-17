import express from 'express';
import { query, queryOne, sql } from '../db';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import type { OrderRecord, OrderStatus, ShippingMethod } from '../types';

const router = express.Router();

const VALID_SHIPPING_METHODS: ShippingMethod[] = [
  'trustdrop',
  'usps_priority', 'usps_ground', 'usps_express',
  'fedex_ground', 'fedex_saver', 'fedex_overnight',
  'ups_ground', 'ups_3day', 'ups_next_day',
];

const VALID_STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

// Buyer creates an order for a listing
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const buyerId = req.user?.id;
    if (!buyerId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const {
      listingId,
      shippingMethod,
      shippingCostCents,
      shippingAddressLine1,
      shippingAddressLine2,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
    } = req.body as {
      listingId?: number;
      shippingMethod?: string;
      shippingCostCents?: number;
      shippingAddressLine1?: string;
      shippingAddressLine2?: string;
      shippingCity?: string;
      shippingState?: string;
      shippingZip?: string;
      shippingCountry?: string;
    };

    if (!listingId || !shippingMethod || !shippingAddressLine1 || !shippingCity || !shippingState || !shippingZip) {
      res.status(400).json({ message: 'listingId, shippingMethod, shippingAddressLine1, shippingCity, shippingState, and shippingZip are required' });
      return;
    }

    if (!VALID_SHIPPING_METHODS.includes(shippingMethod as ShippingMethod)) {
      res.status(400).json({ message: `Invalid shipping method. Must be one of: ${VALID_SHIPPING_METHODS.join(', ')}` });
      return;
    }

    // Get the listing to verify it exists, is active, and get price + seller
    const listing = await queryOne<{
      id: number; seller_id: number; price_cents: number; free_shipping: number;
      shipping_option: string; status: string;
    }>(
      `SELECT id, seller_id, price_cents, free_shipping, shipping_option, status
       FROM listings WHERE id = ${sql.literal(listingId)} LIMIT 1`,
    );

    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    if (listing.status !== 'active') {
      res.status(400).json({ message: 'Listing is no longer available' });
      return;
    }

    if (listing.seller_id === buyerId) {
      res.status(400).json({ message: 'You cannot purchase your own listing' });
      return;
    }

    // Calculate total: if free_shipping, shipping cost is 0
    const actualShippingCost = listing.free_shipping ? 0 : (shippingCostCents ?? 0);
    const totalCents = listing.price_cents + actualShippingCost;

    const result = await queryOne<{ id: number }>(
      `INSERT INTO orders (
        listing_id, buyer_id, seller_id,
        shipping_method, shipping_cost_cents,
        shipping_address_line1, shipping_address_line2,
        shipping_city, shipping_state, shipping_zip, shipping_country,
        status, total_cents
      ) VALUES (
        ${sql.literal(listing.id)}, ${sql.literal(buyerId)}, ${sql.literal(listing.seller_id)},
        ${sql.literal(shippingMethod)}, ${sql.literal(actualShippingCost)},
        ${sql.literal(shippingAddressLine1.trim())}, ${sql.literal((shippingAddressLine2 ?? '').trim())},
        ${sql.literal(shippingCity.trim())}, ${sql.literal(shippingState.trim())},
        ${sql.literal(shippingZip.trim())}, ${sql.literal((shippingCountry ?? 'US').trim())},
        'pending', ${sql.literal(totalCents)}
      )`,
    );

    res.status(201).json({ id: result?.id, message: 'Order created', totalCents });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get orders for the authenticated user (buyer or seller)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const status = req.query.status as string | undefined;
    const role = req.query.role as string | undefined; // 'buyer' or 'seller'

    let whereClause: string;
    if (role === 'seller') {
      whereClause = `o.seller_id = ${sql.literal(userId)}`;
    } else {
      whereClause = `o.buyer_id = ${sql.literal(userId)}`;
    }

    if (status && VALID_STATUSES.includes(status as OrderStatus)) {
      whereClause += ` AND o.status = ${sql.literal(status)}`;
    }

    const orders = await query<OrderRecord & { listing_title: string; buyer_name: string; seller_name: string }>(
      `SELECT o.*,
        l.title AS listing_title,
        bu.name AS buyer_name,
        su.name AS seller_name
       FROM orders o
       JOIN listings l ON l.id = o.listing_id
       JOIN users bu ON bu.id = o.buyer_id
       JOIN users su ON su.id = o.seller_id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC`,
    );

    res.json(orders.map((o) => ({
      id: o.id,
      listingId: o.listing_id,
      listingTitle: o.listing_title,
      buyerId: o.buyer_id,
      buyerName: o.buyer_name,
      sellerId: o.seller_id,
      sellerName: o.seller_name,
      shippingMethod: o.shipping_method,
      shippingCostCents: o.shipping_cost_cents,
      shippingAddressLine1: o.shipping_address_line1,
      shippingAddressLine2: o.shipping_address_line2,
      shippingCity: o.shipping_city,
      shippingState: o.shipping_state,
      shippingZip: o.shipping_zip,
      shippingCountry: o.shipping_country,
      trackingNumber: o.tracking_number,
      trackingCarrier: o.tracking_carrier,
      status: o.status,
      totalCents: o.total_cents,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    })));
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const rawOrderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = Number.parseInt(rawOrderId ?? '', 10);
    if (Number.isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid order id' });
      return;
    }

    const order = await queryOne<OrderRecord & { listing_title: string; buyer_name: string; seller_name: string }>(
      `SELECT o.*,
        l.title AS listing_title,
        bu.name AS buyer_name,
        su.name AS seller_name
       FROM orders o
       JOIN listings l ON l.id = o.listing_id
       JOIN users bu ON bu.id = o.buyer_id
       JOIN users su ON su.id = o.seller_id
       WHERE o.id = ${sql.literal(orderId)}
         AND (o.buyer_id = ${sql.literal(userId)} OR o.seller_id = ${sql.literal(userId)})
       LIMIT 1`,
    );

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({
      id: order.id,
      listingId: order.listing_id,
      listingTitle: order.listing_title,
      buyerId: order.buyer_id,
      buyerName: order.buyer_name,
      sellerId: order.seller_id,
      sellerName: order.seller_name,
      shippingMethod: order.shipping_method,
      shippingCostCents: order.shipping_cost_cents,
      shippingAddressLine1: order.shipping_address_line1,
      shippingAddressLine2: order.shipping_address_line2,
      shippingCity: order.shipping_city,
      shippingState: order.shipping_state,
      shippingZip: order.shipping_zip,
      shippingCountry: order.shipping_country,
      trackingNumber: order.tracking_number,
      trackingCarrier: order.tracking_carrier,
      status: order.status,
      totalCents: order.total_cents,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Seller adds tracking to an order
router.patch('/:id/tracking', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const rawOrderId2 = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId2 = Number.parseInt(rawOrderId2 ?? '', 10);
    if (Number.isNaN(orderId2)) {
      res.status(400).json({ message: 'Invalid order id' });
      return;
    }

    const { trackingNumber, trackingCarrier } = req.body as {
      trackingNumber?: string;
      trackingCarrier?: string;
    };

    if (!trackingNumber) {
      res.status(400).json({ message: 'trackingNumber is required' });
      return;
    }

    // Verify seller owns this order
    const order = await queryOne<{ seller_id: number; status: string }>(
      `SELECT seller_id, status FROM orders WHERE id = ${sql.literal(orderId2)} LIMIT 1`,
    );

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.seller_id !== userId) {
      res.status(403).json({ message: 'Only the seller can add tracking' });
      return;
    }

    await query(
      `UPDATE orders SET
        tracking_number = ${sql.literal(trackingNumber.trim())},
        tracking_carrier = ${sql.literal((trackingCarrier ?? '').trim() || null)},
        status = CASE WHEN status = 'paid' THEN 'shipped' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ${sql.literal(orderId2)}`,
    );

    res.json({ message: 'Tracking updated' });
  } catch (error) {
    console.error('Update tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
