import express from 'express';
import { query, queryOne, sql } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import type { DeliveryRecord, DeliveryStatus } from '../types';

const router = express.Router();

const DELIVERY_STATUSES: DeliveryStatus[] = ['requested', 'assigned', 'picked_up', 'in_transit', 'delivered'];

function formatDelivery(row: DeliveryRecord): DeliveryRecord {
  return {
    ...row,
    estimated_value: Number(row.estimated_value),
  };
}

router.use(authenticate, authorize(['dealer']));

router.post('/', async (req: AuthRequest, res) => {
  try {
    const dealerId = req.user?.id;
    if (!dealerId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { pickupAddress, dropoffAddress, itemDescription, estimatedValue } = req.body as {
      pickupAddress?: string;
      dropoffAddress?: string;
      itemDescription?: string;
      estimatedValue?: number | string;
    };

    const estimatedValueNumber = Number(estimatedValue);

    if (!pickupAddress || !dropoffAddress || !itemDescription || Number.isNaN(estimatedValueNumber)) {
      res.status(400).json({ message: 'pickupAddress, dropoffAddress, itemDescription, and estimatedValue are required' });
      return;
    }

    if (estimatedValueNumber <= 0) {
      res.status(400).json({ message: 'estimatedValue must be greater than 0' });
      return;
    }

    await query(
      `INSERT INTO deliveries (
        dealer_id,
        pickup_address,
        dropoff_address,
        item_description,
        estimated_value,
        status,
        updated_at
      ) VALUES (
        ${sql.literal(dealerId)},
        ${sql.literal(pickupAddress.trim())},
        ${sql.literal(dropoffAddress.trim())},
        ${sql.literal(itemDescription.trim())},
        ${sql.literal(estimatedValueNumber)},
        'requested',
        CURRENT_TIMESTAMP
      )`,
    );

    const createdDelivery = await queryOne<DeliveryRecord>(
      `SELECT
        d.*, 
        c.name AS courier_name,
        c.email AS courier_email
      FROM deliveries d
      LEFT JOIN users c ON c.id = d.courier_id
      WHERE d.dealer_id = ${sql.literal(dealerId)}
      ORDER BY d.id DESC
      LIMIT 1`,
    );

    if (!createdDelivery) {
      res.status(500).json({ message: 'Failed to create delivery' });
      return;
    }

    await query(
      `INSERT INTO status_history (delivery_id, status, changed_by)
       VALUES (${sql.literal(createdDelivery.id)}, 'requested', ${sql.literal(dealerId)})`,
    );

    res.status(201).json(formatDelivery(createdDelivery));
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const dealerId = req.user?.id;
    if (!dealerId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const status = req.query.status;

    let statusClause = '';
    if (typeof status === 'string' && status.trim() !== '') {
      if (!DELIVERY_STATUSES.includes(status as DeliveryStatus)) {
        res.status(400).json({ message: 'Invalid status filter' });
        return;
      }
      statusClause = ` AND d.status = ${sql.literal(status)}`;
    }

    const deliveries = await query<DeliveryRecord>(
      `SELECT
        d.*,
        c.name AS courier_name,
        c.email AS courier_email
      FROM deliveries d
      LEFT JOIN users c ON c.id = d.courier_id
      WHERE d.dealer_id = ${sql.literal(dealerId)}${statusClause}
      ORDER BY d.created_at DESC`,
    );

    res.json(deliveries.map(formatDelivery));
  } catch (error) {
    console.error('List deliveries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const dealerId = req.user?.id;
    if (!dealerId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const rawDeliveryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deliveryId = Number.parseInt(rawDeliveryId ?? '', 10);
    if (Number.isNaN(deliveryId)) {
      res.status(400).json({ message: 'Invalid delivery id' });
      return;
    }

    const delivery = await queryOne<DeliveryRecord>(
      `SELECT
        d.*,
        c.name AS courier_name,
        c.email AS courier_email
      FROM deliveries d
      LEFT JOIN users c ON c.id = d.courier_id
      WHERE d.id = ${sql.literal(deliveryId)}
        AND d.dealer_id = ${sql.literal(dealerId)}
      LIMIT 1`,
    );

    if (!delivery) {
      res.status(404).json({ message: 'Delivery not found' });
      return;
    }

    const history = await query<{ id: number; status: DeliveryStatus; changed_at: string; changed_by: number }>(
      `SELECT id, status, changed_at, changed_by
       FROM status_history
       WHERE delivery_id = ${sql.literal(deliveryId)}
       ORDER BY changed_at ASC`,
    );

    res.json({
      ...formatDelivery(delivery),
      history,
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
