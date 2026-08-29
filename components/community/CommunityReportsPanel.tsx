'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { communityAPI } from '@/lib/api/community';

interface CommunityReportsPanelProps {
  communityId: string;
}

export function CommunityReportsPanel({ communityId }: CommunityReportsPanelProps) {
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ['community-reports', communityId],
    queryFn: async () => {
      const res = await communityAPI.communityReports(communityId, { status: 'open' });
      return res.data.data.reports ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      reportId,
      status,
    }: {
      reportId: string;
      status: 'reviewed' | 'dismissed';
    }) => communityAPI.updateReport(communityId, reportId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community-reports', communityId] });
    },
  });

  const reports = reportsQuery.data ?? [];
  if (reportsQuery.isLoading) {
    return (
      <div className="section-card flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (reports.length === 0) return null;

  return (
    <div className="section-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flag className="h-4 w-4 text-destructive" />
          Open reports
        </p>
        <p className="text-xs text-muted-foreground">
          Flagged chat messages and related abuse reports
        </p>
      </div>
      <ul className="divide-y divide-border">
        {reports.map((report) => {
          const busy =
            updateMutation.isPending && updateMutation.variables?.reportId === report.id;
          return (
            <li key={report.id} className="space-y-2 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {report.reason.replace(/_/g, ' ')} · {report.targetType.replace(/_/g, ' ')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  By {report.reporter.name}
                  {report.preview ? ` · “${report.preview}”` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    updateMutation.mutate({ reportId: report.id, status: 'reviewed' })
                  }
                >
                  Mark reviewed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    updateMutation.mutate({ reportId: report.id, status: 'dismissed' })
                  }
                >
                  Dismiss
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
