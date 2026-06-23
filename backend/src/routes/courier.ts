import express from 'express';
import { query, queryOne, sql } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import type { DeliveryRecord, DeliveryStatus } from '../types';

const router = express.Router();

const STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus | null> = {
  requested: 'assigned',
  assigned: 'picked_up',
  picked_up: 'in_transit',
  in_transit: 'delivered',
  delivered: null,
};

function formatDelivery(row: DeliveryRecord): DeliveryRecord {
  return {
    ...row,
    estimated_value: Number(row.estimated_value),
  };
}

router.use(authenticate, authorize(['courier']));

router.get('/available-deliveries', async (req: AuthRequest, res) => {
  try {
    const courierId = req.user?.id;

    if (!courierId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const deliveries = await query<DeliveryRecord>(
      `SELECT
        d.*,
        dealer.name AS dealer_name,
        dealer.email AS dealer_email
      FROM deliveries d
      INNER JOIN dealer_courier_approvals approvals
        ON approvals.dealer_id = d.dealer_id
       AND approvals.courier_id = ${sql.literal(courierId)}
       AND approvals.status = 'approved'
      INNER JOIN users dealer ON dealer.id = d.dealer_id
      WHERE d.status = 'requested'
        AND d.courier_id IS NULL
      ORDER BY d.created_at DESC`,
    );

    res.json(deliveries.map(formatDelivery));
  } catch (error) {
    console.error('Available deliveries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/accept/:id', async (req: AuthRequest, res) => {
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

    const delivery = await queryOne<DeliveryRecord>(
      `SELECT d.*
       FROM deliveries d
       INNER JOIN dealer_courier_approvals approvals
         ON approvals.dealer_id = d.dealer_id
        AND approvals.courier_id = ${sql.literal(courierId)}
        AND approvals.status = 'approved'
       WHERE d.id = ${sql.literal(deliveryId)}
         AND d.status = 'requested'
         AND d.courier_id IS NULL
       LIMIT 1`,
    );

    if (!delivery) {
      res.status(404).json({
        message: 'Delivery is not available to accept. You may not be approved by this dealer or it may already be assigned.',
      });
      return;
    }

    await query(
      `UPDATE deliveries
       SET courier_id = ${sql.literal(courierId)},
           status = 'assigned',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ${sql.literal(deliveryId)}
         AND status = 'requested'
         AND courier_id IS NULL`,
    );

    await query(
      `INSERT INTO status_history (delivery_id, status, changed_by)
       VALUES (${sql.literal(deliveryId)}, 'assigned', ${sql.literal(courierId)})`,
    );

    const acceptedDelivery = await queryOne<DeliveryRecord>(
      `SELECT
        d.*,
        dealer.name AS dealer_name,
        dealer.email AS dealer_email
      FROM deliveries d
      INNER JOIN users dealer ON dealer.id = d.dealer_id
      WHERE d.id = ${sql.literal(deliveryId)}
      LIMIT 1`,
    );

    res.json(formatDelivery(acceptedDelivery ?? delivery));
  } catch (error) {
    console.error('Accept delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my-deliveries', async (req: AuthRequest, res) => {
  try {
    const courierId = req.user?.id;

    if (!courierId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const deliveries = await query<DeliveryRecord>(
      `SELECT
        d.*,
        dealer.name AS dealer_name,
        dealer.email AS dealer_email
      FROM deliveries d
      INNER JOIN users dealer ON dealer.id = d.dealer_id
      WHERE d.courier_id = ${sql.literal(courierId)}
      ORDER BY d.updated_at DESC`,
    );

    res.json(deliveries.map(formatDelivery));
  } catch (error) {
    console.error('My deliveries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/deliveries/:id', async (req: AuthRequest, res) => {
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

    const delivery = await queryOne<DeliveryRecord>(
      `SELECT
        d.*,
        dealer.name AS dealer_name,
        dealer.email AS dealer_email
      FROM deliveries d
      INNER JOIN users dealer ON dealer.id = d.dealer_id
      WHERE d.id = ${sql.literal(deliveryId)}
        AND d.courier_id = ${sql.literal(courierId)}
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
    console.error('Courier delivery detail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/status/:id', async (req: AuthRequest, res) => {
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

    const { status } = req.body as { status?: DeliveryStatus };

    if (!status || !Object.keys(STATUS_TRANSITIONS).includes(status)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }

    const delivery = await queryOne<DeliveryRecord>(
      `SELECT id, status, courier_id, dealer_id, pickup_address, dropoff_address, item_description, estimated_value, created_at, updated_at
       FROM deliveries
       WHERE id = ${sql.literal(deliveryId)}
         AND courier_id = ${sql.literal(courierId)}
       LIMIT 1`,
    );

    if (!delivery) {
      res.status(404).json({ message: 'Delivery not found' });
      return;
    }

    const expectedNextStatus = STATUS_TRANSITIONS[delivery.status];
    if (expectedNextStatus !== status) {
      res.status(400).json({
        message: `Invalid status transition. The next valid status after '${delivery.status}' is '${expectedNextStatus}'.`,
      });
      return;
    }

    await query(
      `UPDATE deliveries
       SET status = ${sql.literal(status)},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ${sql.literal(deliveryId)}
         AND courier_id = ${sql.literal(courierId)}`,
    );

    await query(
      `INSERT INTO status_history (delivery_id, status, changed_by)
       VALUES (${sql.literal(deliveryId)}, ${sql.literal(status)}, ${sql.literal(courierId)})`,
    );

    const updatedDelivery = await queryOne<DeliveryRecord>(
      `SELECT
        d.*,
        dealer.name AS dealer_name,
        dealer.email AS dealer_email
      FROM deliveries d
      INNER JOIN users dealer ON dealer.id = d.dealer_id
      WHERE d.id = ${sql.literal(deliveryId)}
      LIMIT 1`,
    );

    res.json(formatDelivery(updatedDelivery ?? { ...delivery, status }));
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
