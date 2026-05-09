import { Router, Request, Response } from 'express';
import { verifyPaymentTransaction } from '../services/stellar';

const router: Router = Router();

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const { tx_hash, expected_destination, expected_amount_sol, expected_memo } = body;

    if (!tx_hash) {
      res.status(400).json({ error: 'Missing tx_hash' });
      return;
    }

    const result = await verifyPaymentTransaction(
      tx_hash,
      expected_destination || '',
      parseFloat(expected_amount_sol) || 0,
      expected_memo || ''
    );

    res.json({
      valid: result.valid,
      error: result.error || null,
    });
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
