import axios from 'axios';

export async function POST(req: Request) {
  const body = await req.json();
  const base = process.env.DELTA_API_URL || `http://delta-api:${process.env.PORT_DELTA_API || 8000}`;
  const res = await axios.post(`${base}/seed`, body);
  return new Response(JSON.stringify(res.data), { status: 200 });
}

