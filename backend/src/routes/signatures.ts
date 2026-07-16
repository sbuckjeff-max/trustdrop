import express from 'express';
import { query, queryOne, sql } from '../db';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import type { DeliveryRecord } from '../types';

const router = express.Router();

router.use(authenticate);

// Courier uploads a buyer's handoff signature
router.post('/deliveries/:id/signature', async (req: AuthRequest, res) => {
  try {
    const courierId = req.user?.id;
    if (!courierId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const rawDeliveryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deliveryId = Number.parseInt(rawDeliveryId ?? '', 10);
    if (Number.isNaN(deliveryId)) {
      res.status(400).json({ message: 'Invalid delivery id' });
      return;
    }

    const { signatureData } = req.body as { signatureData?: string };
    if (!signatureData || typeof signatureData !== 'string' || !signatureData.startsWith('data:image/png;base64,')) {
      res.status(400).json({ message: 'signatureData must be a PNG base64 data URI (data:image/png;base64,...)' });
      return;
    }

    // Limit to ~1MB
    if (signatureData.length > 1_500_000) {
      res.status(400).json({ message: 'Signature too large. Maximum ~1MB.' });
      return;
    }

    // Verify courier is assigned to this delivery
    const delivery = await queryOne<DeliveryRecord>(
      `SELECT id, courier_id FROM deliveries
       WHERE id = ${sql.literal(deliveryId)}
         AND courier_id = ${sql.literal(courierId)}
       LIMIT 1`,
    );

    if (!delivery) {
      res.status(404).json({ message: 'Delivery not found or not assigned to you' });
      return;
    }

    await query(
      `INSERT INTO delivery_signatures (delivery_id, courier_id, signature_data)
       VALUES (${sql.literal(deliveryId)}, ${sql.literal(courierId)}, ${sql.literal(signatureData)})`,
    );

    res.status(201).json({ message: 'Signature saved' });
  } catch (error) {
    console.error('Upload signature error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dealer or courier retrieves the latest handoff signature
router.get('/deliveries/:id/signature', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const rawDeliveryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deliveryId = Number.parseInt(rawDeliveryId ?? '', 10);
    if (Number.isNaN(deliveryId)) {
      res.status(400).json({ message: 'Invalid delivery id' });
      return;
    }

    // Verify access
    const delivery = await queryOne<DeliveryRecord>(
      `SELECT id, dealer_id, courier_id FROM deliveries
       WHERE id = ${sql.literal(deliveryId)}
       LIMIT 1`,
    );

    if (!delivery) {
      res.status(404).json({ message: 'Delivery not found' });
      return;
    }

    const isDealer = userRole === 'dealer' && delivery.dealer_id === userId;
    const isCourier = delivery.courier_id === userId;

    if (!isDealer && !isCourier) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const sig = await queryOne<{ id: number; delivery_id: number; courier_id: number; signature_data: string; captured_at: string }>(
      `SELECT id, delivery_id, courier_id, signature_data, captured_at
       FROM delivery_signatures
       WHERE delivery_id = ${sql.literal(deliveryId)}
       ORDER BY captured_at DESC
       LIMIT 1`,
    );

    if (!sig) {
      res.status(404).json({ message: 'No signature found for this delivery' });
      return;
    }

    res.json({
      id: sig.id,
      deliveryId: sig.delivery_id,
      courierId: sig.courier_id,
      signatureData: sig.signature_data,
      capturedAt: sig.captured_at,
    });
  } catch (error) {
    console.error('Get signature error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
