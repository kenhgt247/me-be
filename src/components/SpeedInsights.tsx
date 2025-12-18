import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/react';

/**
 * SpeedInsights component wrapper for Vercel Speed Insights integration.
 * This component enables performance monitoring and Web Vitals tracking
 * in the application.
 *
 * For more information, visit: https://vercel.com/docs/speed-insights
 */
export function SpeedInsights() {
  return <VercelSpeedInsights />;
}
