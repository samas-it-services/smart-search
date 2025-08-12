import axios from 'axios';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  const base = process.env.DELTA_API_URL || `http://delta-api:${process.env.PORT_DELTA_API || 8000}`;
  const res = await axios.get(`${base}/progress`, { params: { jobId } });
  return new Response(JSON.stringify(res.data), { status: 200 });
}

