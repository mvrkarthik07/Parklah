import rateLimit from 'express-rate-limit'
export const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 })
export const searchLimiter = rateLimit({ windowMs: 60*1000, max: 60 })
