import { Head, router, useForm, usePoll } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import * as campaignRoutes from '@/routes/campaigns';

interface Prospect {
    id: number;
    first_name: string;
    last_name: string | null;
    phone: string;
    status: 'pending' | 'sent' | 'failed';
    sent_at: string | null;
    message: string | null;
}

interface Campaign {
    id: number;
    name: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    expires_at: string | null;
    created_at: string;
}

interface Stats {
    total: number;
    pending: number;
    sent: number;
    failed: number;
}

interface Props {
    campaign: Campaign;
    prospects: Prospect[];
    stats: Stats;
    next_send_at: string | null;
}

const prospectStatusColor: Record<
    Prospect['status'],
    'secondary' | 'default' | 'destructive'
> = {
    pending: 'secondary',
    sent: 'default',
    failed: 'destructive',
};

export default function CampaignShow({ campaign, prospects, stats, next_send_at }: Props) {
    const { delete: destroy, processing } = useForm({});

    const isActive = campaign.status === 'pending' || campaign.status === 'running';

    const { stop } = usePoll(
        3000,
        { only: ['campaign', 'stats', 'prospects', 'next_send_at'] },
        { autoStart: isActive },
    );

    useEffect(() => {
        if (!isActive) stop();
    }, [campaign.status]);

    const [countdown, setCountdown] = useState<number | null>(null);

    useEffect(() => {
        if (!next_send_at || !isActive) { setCountdown(null); return; }
        const tick = () => {
            const secs = Math.max(0, Math.round((new Date(next_send_at).getTime() - Date.now()) / 1000));
            setCountdown(secs);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [next_send_at, isActive]);

    function handleDelete() {
        if (
            !confirm(
                `Delete campaign "${campaign.name}"? This cannot be undone.`,
            )
        )
            return;
        destroy(campaignRoutes.destroy.url(campaign.id), {
            onSuccess: () => router.visit(campaignRoutes.index.url()),
        });
    }

    const firstPendingId = prospects.find((p) => p.status === 'pending')?.id ?? null;

    const sentPercent =
        stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
    const expiresAt = campaign.expires_at
        ? new Date(campaign.expires_at)
        : null;
    const expired = expiresAt ? expiresAt < new Date() : false;

    return (
        <>
            <Head title={campaign.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold">
                                {campaign.name}
                            </h1>
                            <Badge
                                variant={
                                    campaign.status === 'failed'
                                        ? 'destructive'
                                        : campaign.status === 'completed'
                                          ? 'outline'
                                          : 'default'
                                }
                            >
                                {campaign.status}
                            </Badge>
                            {expired && (
                                <Badge variant="destructive">Expired</Badge>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {campaign.description}
                        </p>
                        {expiresAt && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Offer expires: {expiresAt.toLocaleString()}
                            </p>
                        )}
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={processing}
                    >
                        Delete
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        { label: 'Total',   value: stats.total,   color: 'text-foreground' },
                        { label: 'Sent',    value: stats.sent,    color: 'text-green-600 dark:text-green-400' },
                        { label: 'Pending', value: stats.pending, color: 'text-yellow-600 dark:text-yellow-400' },
                        { label: 'Failed',  value: stats.failed,  color: 'text-destructive' },
                    ].map(({ label, value, color }) => (
                        <Card key={label}>
                            <CardHeader className="px-4 pt-4 pb-1">
                                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                    {label}
                                </p>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <p className={`text-3xl font-bold ${color}`}>
                                    {value}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Progress bar */}
                {stats.total > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Sending progress</span>
                            <span>{sentPercent}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${sentPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Prospects table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Prospects ({stats.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-muted-foreground">
                                        <th className="px-4 py-2.5 text-left font-medium">
                                            Name
                                        </th>
                                        <th className="px-4 py-2.5 text-left font-medium">
                                            Phone
                                        </th>
                                        <th className="px-4 py-2.5 text-left font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-2.5 text-left font-medium">
                                            Sent at
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prospects.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="border-b last:border-0 hover:bg-muted/20"
                                        >
                                            <td className="px-4 py-2.5 font-medium">
                                                {p.first_name} {p.last_name}
                                            </td>
                                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                                                {p.phone}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={prospectStatusColor[p.status]}>
                                                        {p.status}
                                                    </Badge>
                                                    {p.status === 'pending' && isActive && p.id === firstPendingId && (
                                                        <span className="flex items-center gap-1 text-yellow-500">
                                                            <Spinner className="size-3" />
                                                            {countdown !== null && countdown > 0 && (
                                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                                    {countdown}s
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                                {p.sent_at
                                                    ? new Date(
                                                          p.sent_at,
                                                      ).toLocaleString()
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
