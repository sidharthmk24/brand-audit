import { validateCredentials, createSessionToken, setSessionCookie } from '@/lib/admin/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!validateCredentials(email, password)) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await createSessionToken();
    await setSessionCookie(token);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[Admin Login] Error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
