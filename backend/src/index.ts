import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import authRoutes from './routes/auth';
import courierRoutes from './routes/courier';
import deliveriesRoutes from './routes/deliveries';
import locationRoutes from './routes/location';
import photoRoutes from './routes/photos';
import signatureRoutes from './routes/signatures';

dotenv.config();

const app = express();
const PORT = Number.parseInt(process.env.PORT || '8000', 10);

app.use(cors());
app.use(express.json({ limit: '8mb' }));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TrustDrop API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api', locationRoutes);
app.use('/api', photoRoutes);
app.use('/api', signatureRoutes);
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/courier', courierRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server is running on http://0.0.0.0:${PORT}`);
});
