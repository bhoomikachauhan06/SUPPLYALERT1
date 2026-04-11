import dynamic from 'next/dynamic';

// Next.js dynamic import wrapper for the Leaflet map to disable SSR
export const DynamicRiskMap = dynamic(
  () => import('./RiskMap'),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl animate-pulse"><div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"/></div> }
);
