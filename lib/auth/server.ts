import { cookies } from 'next/headers';
import { FIXED_PARTNERS, DEFAULT_PARTNER_ID, getPartner, Partner } from './partner-context';

export async function getServerPartner(): Promise<Partner> {
  try {
    const cookieStore = await cookies();
    const id = cookieStore.get('active_partner_id')?.value;
    return getPartner(id || DEFAULT_PARTNER_ID);
  } catch {
    return FIXED_PARTNERS[DEFAULT_PARTNER_ID];
  }
}
