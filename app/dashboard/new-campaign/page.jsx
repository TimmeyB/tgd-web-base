import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import NewCampaignForm from './new-campaign-form';

export default async function NewCampaignPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const result = await query('SELECT subscription_status FROM brands WHERE id = $1', [session.brandId]);
  const brand = result.rows[0];
  const subscriptionActive = brand?.subscription_status === 'active';

  // No redirect here on purpose — brands can build out the entire campaign
  // (type, details, screening) for free. Subscription is only enforced when
  // they actually hit Launch, both here (UI) and server-side in the API route.
  return <NewCampaignForm subscriptionActive={subscriptionActive} />;
}
