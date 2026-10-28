import type { Metadata } from 'next';
import { DataSyncView } from '../../components/DataSyncView';

export const metadata: Metadata = { title: 'Data & Backup' };

export default function DataPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <DataSyncView />
    </div>
  );
}
