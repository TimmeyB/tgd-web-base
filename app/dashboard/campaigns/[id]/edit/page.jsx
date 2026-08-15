import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import EditCampaignForm from './edit-campaign-form';

export default async function EditCampaignPage({ params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const result = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [params.id, session.brandId]);
  const campaign = result.rows[0];
  if (!campaign) notFound();

  return <EditCampaignForm campaign={campaign} />;
}
