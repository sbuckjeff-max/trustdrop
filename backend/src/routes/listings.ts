import express from 'express';
import { query, queryOne, sql } from '../db';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import type { ListingRecord } from '../types';

const router = express.Router();

// Public: browse active listings with search, filter, sort, pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      metal_type: metalType,
      min_price: minPrice,
      max_price: maxPrice,
      shipping,
      sort = 'newest',
      page = '1',
      limit = '20',
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit ?? '20', 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ["l.status = 'active'"];
    const params: string[] = [];

    if (search && search.trim()) {
      const term = `%${search.trim().replace(/'/g, "''")}%`;
      conditions.push(
        `(l.title LIKE ${sql.literal(term)} OR l.description LIKE ${sql.literal(term)} OR l.category LIKE ${sql.literal(term)} OR l.denomination LIKE ${sql.literal(term)} OR l.metal_type LIKE ${sql.literal(term)})`,
      );
    }

    if (category) {
      conditions.push(`l.category = ${sql.literal(category)}`);
    }

    if (metalType) {
      conditions.push(`l.metal_type = ${sql.literal(metalType)}`);
    }

    if (minPrice) {
      conditions.push(`l.price_cents >= ${sql.literal(Number(minPrice))}`);
    }

    if (maxPrice) {
      conditions.push(`l.price_cents <= ${sql.literal(Number(maxPrice))}`);
    }

    if (shipping) {
      conditions.push(`l.shipping_option = ${sql.literal(shipping)}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderClause = 'ORDER BY l.created_at DESC';
    if (sort === 'price_asc') orderClause = 'ORDER BY l.price_cents ASC';
    else if (sort === 'price_desc') orderClause = 'ORDER BY l.price_cents DESC';
    else if (sort === 'oldest') orderClause = 'ORDER BY l.created_at ASC';

    const countRow = await queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM listings l ${whereClause}`,
    );
    const total = countRow?.cnt ?? 0;

    const rows = await query<ListingRecord & { seller_name: string }>(
      `SELECT l.*, u.name as seller_name
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       ${whereClause}
       ${orderClause}
       LIMIT ${limitNum} OFFSET ${offset}`,
    );

    const listings = rows.map((r) => ({
      id: r.id,
      sellerId: r.seller_id,
      sellerName: r.seller_name,
      title: r.title,
      description: r.description,
      category: r.category,
      denomination: r.denomination,
      metalType: r.metal_type,
      weightGrams: r.weight_grams,
      priceCents: r.price_cents,
      shippingOption: r.shipping_option,
      freeShipping: r.free_shipping === 1,
      packageWeightGrams: r.package_weight_grams,
      packageLengthCm: r.package_length_cm,
      packageWidthCm: r.package_width_cm,
      packageHeightCm: r.package_height_cm,
      images: JSON.parse(r.images || '[]'),
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json({
      listings,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Listings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Authenticated: create listing (dealer only)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || userRole !== 'dealer') {
      res.status(403).json({ message: 'Only dealers can create listings' });
      return;
    }

    const { title, description, category, denomination, metalType, weightGrams, priceCents, shippingOption, freeShipping, packageWeightGrams, packageLengthCm, packageWidthCm, packageHeightCm, images } =
      req.body as {
        title?: string;
        description?: string;
        category?: string;
        denomination?: string;
        metalType?: string;
        weightGrams?: number;
        priceCents?: number;
        shippingOption?: string;
        freeShipping?: boolean;
        packageWeightGrams?: number;
        packageLengthCm?: number;
        packageWidthCm?: number;
        packageHeightCm?: number;
        images?: string[];
      };

    if (!title || !description || !category || priceCents == null) {
      res.status(400).json({ message: 'title, description, category, and priceCents are required' });
      return;
    }

    if (!['coin', 'paper_money', 'bullion', 'scrap'].includes(category)) {
      res.status(400).json({ message: 'Invalid category' });
      return;
    }

    const imagesJson = JSON.stringify(images ?? []);

    const result = await queryOne<{ id: number }>(
      `INSERT INTO listings (seller_id, title, description, category, denomination, metal_type, weight_grams, price_cents, shipping_option, free_shipping, package_weight_grams, package_length_cm, package_width_cm, package_height_cm, images)
       VALUES (${sql.literal(userId)}, ${sql.literal(title)}, ${sql.literal(description)}, ${sql.literal(category)},
               ${sql.literal(denomination ?? null)}, ${sql.literal(metalType ?? null)}, ${sql.literal(weightGrams ?? null)},
               ${sql.literal(priceCents)}, ${sql.literal(shippingOption ?? 'seller_ships')},
               ${sql.literal(freeShipping ? 1 : 0)}, ${sql.literal(packageWeightGrams ?? null)},
               ${sql.literal(packageLengthCm ?? null)}, ${sql.literal(packageWidthCm ?? null)},
               ${sql.literal(packageHeightCm ?? null)}, ${sql.literal(imagesJson)})`,
    );

    res.status(201).json({ id: result?.id, message: 'Listing created' });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: get single listing
router.get('/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id ?? '', 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const row = await queryOne<ListingRecord & { seller_name: string }>(
      `SELECT l.*, u.name as seller_name
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       WHERE l.id = ${sql.literal(id)}
       LIMIT 1`,
    );

    if (!row) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    res.json({
      id: row.id,
      sellerId: row.seller_id,
      sellerName: row.seller_name,
      title: row.title,
      description: row.description,
      category: row.category,
      denomination: row.denomination,
      metalType: row.metal_type,
      weightGrams: row.weight_grams,
      priceCents: row.price_cents,
      shippingOption: row.shipping_option,
      freeShipping: row.free_shipping === 1,
      packageWeightGrams: row.package_weight_grams,
      packageLengthCm: row.package_length_cm,
      packageWidthCm: row.package_width_cm,
      packageHeightCm: row.package_height_cm,
      images: JSON.parse(row.images || '[]'),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
