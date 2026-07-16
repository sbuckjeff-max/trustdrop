import express from 'express';
import { query, queryOne, sql } from '../db';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import type { DeliveryRecord } from '../types';

const router = express.Router();

router.use(authenticate);

// Courier uploads a handoff photo
router.post('/deliveries/:id/photo', async (req: AuthRequest, res) => {
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

    const { photoData } = req.body as { photoData?: string };
    if (!photoData || typeof photoData !== 'string' || !photoData.startsWith('data:image/')) {
      res.status(400).json({ message: 'photoData must be a base64 data URI (data:image/...)' });
      return;
    }

    // Limit photo size to ~5MB base64
    if (photoData.length > 7_000_000) {
      res.status(400).json({ message: 'Photo too large. Maximum ~5MB.' });
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
      `INSERT INTO delivery_photos (delivery_id, courier_id, photo_data)
       VALUES (${sql.literal(deliveryId)}, ${sql.literal(courierId)}, ${sql.literal(photoData)})`,
    );

    res.status(201).json({ message: 'Photo saved' });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dealer or courier retrieves the latest handoff photo
router.get('/deliveries/:id/photo', async (req: AuthRequest, res) => {
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

    const photo = await queryOne<{ id: number; delivery_id: number; courier_id: number; photo_data: string; captured_at: string }>(
      `SELECT id, delivery_id, courier_id, photo_data, captured_at
       FROM delivery_photos
       WHERE delivery_id = ${sql.literal(deliveryId)}
       ORDER BY captured_at DESC
       LIMIT 1`,
    );

    if (!photo) {
      res.status(404).json({ message: 'No photo found for this delivery' });
      return;
    }

    res.json({
      id: photo.id,
      deliveryId: photo.delivery_id,
      courierId: photo.courier_id,
      photoData: photo.photo_data,
      capturedAt: photo.captured_at,
    });
  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
