import { fetchMetaData, calcVariation } from '../lib/meta';
import Dashboard from '../components/Dashboard';

// Revalidar la página cada hora
export const revalidate = 3600;

export default async function Home() {
  const metaData = await fetchMetaData();

  // Calcular variaciones
  const variations = {
    spend: calcVariation(metaData.current.spend, metaData.prev.spend),
    totalLeads: calcVariation(metaData.current.totalLeads, metaData.prev.totalLeads),
    cpl: calcVariation(metaData.current.cpl, metaData.prev.cpl),
    formLeads: calcVariation(metaData.current.formLeads, metaData.prev.formLeads),
    waLeads: calcVariation(metaData.current.waLeads, metaData.prev.waLeads),
  };

  return (
    <Dashboard
      metaData={metaData}
      variations={variations}
    />
  );
}
