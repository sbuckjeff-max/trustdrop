import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.ts';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;
app.use(cors());
app.use(express.json());
// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
// Routes
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'TrustDrop API is running' });
});
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong' });
});
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map