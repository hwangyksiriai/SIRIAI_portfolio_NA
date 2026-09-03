import { getConfig } from '@/lib/blobConfig';
import PortfolioView from './PortfolioView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const config = await getConfig();
  return <PortfolioView config={config} />;
}
