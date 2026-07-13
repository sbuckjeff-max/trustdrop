import express from 'express';
import { query, queryOne, sql } from '../db';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import type { CourierLocationRecord, DeliveryRecord } from '../types';

const router = express.Router();

// Both couriers and dealers need to access location data
router.use(authenticate);

// Couriers report their position
router.post('/deliveries/:id/location', async (req: AuthRequest, res) => {
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

    const { latitude, longitude, accuracy } = req.body as {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    };

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ message: 'latitude and longitude are required as numbers' });
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({ message: 'Invalid coordinates' });
      return;
    }

    // Verify courier owns this delivery and it's in an active state
    const delivery = await queryOne<DeliveryRecord>(
      `SELECT id, courier_id, status FROM deliveries
       WHERE id = ${sql.literal(deliveryId)}
         AND courier_id = ${sql.literal(courierId)}
         AND status IN ('picked_up', 'in_transit')
       LIMIT 1`,
    );

    if (!delivery) {
      res.status(404).json({
        message: 'Delivery not found or not in active state. Location sharing requires picked_up or in_transit status.',
      });
      return;
    }

    await query(
      `INSERT INTO courier_locations (courier_id, delivery_id, latitude, longitude, accuracy)
       VALUES (
         ${sql.literal(courierId)},
         ${sql.literal(deliveryId)},
         ${sql.literal(latitude)},
         ${sql.literal(longitude)},
         ${sql.literal(accuracy ?? null)}
       )`,
    );

    res.status(201).json({ message: 'Location recorded' });
  } catch (error) {
    console.error('Report location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get location data for a delivery (dealer or assigned courier can access)
router.get('/deliveries/:id/location', async (req: AuthRequest, res) => {
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

    // Verify access: dealer must own the delivery, courier must be assigned
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
    const isAssignedCourier = delivery.courier_id === userId;

    if (!isDealer && !isAssignedCourier) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Return the latest position + recent trail (last 200 points)
    const locations = await query<CourierLocationRecord>(
      `SELECT id, courier_id, delivery_id, latitude, longitude, accuracy, timestamp
       FROM courier_locations
       WHERE delivery_id = ${sql.literal(deliveryId)}
       ORDER BY timestamp DESC
       LIMIT 200`,
    );

    // Reverse to chronological order for consumers
    const chronological = locations.reverse();

    const latest = chronological.length > 0 ? chronological[chronological.length - 1] : null;

    res.json({
      latest,
      trail: chronological,
    });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
