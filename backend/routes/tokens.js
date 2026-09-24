import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllTokens, getTokenByValue, createToken, updateTokenStatus } from '../services/tokenService.js';

const router = express.Router();

router.post('/', (req, res, next) => {
  try {
    const t = createToken(req.body);
    res.status(201).json(createSuccessResponse(t, 'Token generated', 201));
  } catch (e) { next(e); }
});

router.get('/', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getAllTokens(req.query)));
  } catch (e) { next(e); }
});

router.get('/:token', (req, res, next) => {
  try {
    const t = getTokenByValue(req.params.token);
    if (!t) return res.status(404).json({ success: false, error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' } });
    res.json(createSuccessResponse(t));
  } catch (e) { next(e); }
});

router.put('/:token/status', (req, res, next) => {
  try {
    const t = updateTokenStatus(req.params.token, req.body.status);
    res.json(createSuccessResponse(t, 'Token status updated'));
  } catch (e) { next(e); }
});

export default router;
