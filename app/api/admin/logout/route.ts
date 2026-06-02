import { clearSessionCookie } from '@/lib/admin/auth';

export async function POST() {
  await clearSessionCookie();
  return Response.json({ success: true });
}
