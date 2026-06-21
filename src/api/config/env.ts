export const isProduction = process.env.NODE_ENV === 'production';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (isProduction && !secret) {
    throw new Error('JWT_SECRET is required in production');
  }
  return secret || 'kim_academy_dev_secret_change_me';
}

export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN || '';
  if (isProduction && !raw) {
    throw new Error('CORS_ORIGIN is required in production');
  }
  return raw
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

