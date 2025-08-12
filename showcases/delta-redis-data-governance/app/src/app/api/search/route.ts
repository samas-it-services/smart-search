import axios from 'axios';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());
  const role = params.role || 'business_user';
  const base = process.env.DELTA_API_URL || `http://delta-api:${process.env.PORT_DELTA_API || 8000}`;
  const res = await axios.get(`${base}/search`, {
    params,
    headers: {
      'X-User-Role': role,
      'X-User-Context': JSON.stringify({ allowed_regions: ['NE', 'SW'], id: 'demo-user' })
    }
  });
  return new Response(JSON.stringify(res.data), { status: 200 });
}

