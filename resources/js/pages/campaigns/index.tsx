import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import * as campaigns from '@/routes/campaigns';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';

interface Campaign {
    id: number;
    name: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    expires_at: string | null;
    prospects_count: number;
    created_at: string;
}

interface Props {
    campaigns: Campaign[];
}

const statusColors: Record<Campaign['status'], string> = {
    pending: 'secondary',
    running: 'default',
    completed: 'outline',
    failed: 'destructive',
} as const;

function NewCampaignForm({ onSuccess }: { onSuccess: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        description: '',
        message: '',
        csv_file: null as File | null,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(campaigns.store.url(), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                onSuccess();
            },
        });
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="name">Campaign name</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    placeholder="Debt management offer – June 2026"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                    id="description"
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    placeholder="Offer for Propulsion members – valid 24h"
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="message">Message template</Label>
                <Textarea
                    id="message"
                    rows={6}
                    value={data.message}
                    onChange={e => setData('message', e.target.value)}
                    placeholder="Hello *{first_name}*,&#10;&#10;Use {first_name}, {last_name}, {full_name} as placeholders."
                    className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    Placeholders: <code className="bg-muted px-1 rounded">{'{first_name}'}</code>{' '}
                    <code className="bg-muted px-1 rounded">{'{last_name}'}</code>{' '}
                    <code className="bg-muted px-1 rounded">{'{full_name}'}</code>
                    {' — '}use <code className="bg-muted px-1 rounded">*bold*</code> and{' '}
                    <code className="bg-muted px-1 rounded">_italic_</code> for WhatsApp formatting.
                </p>
                {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="csv_file">Prospects file (CSV / Excel)</Label>
                <Input
                    id="csv_file"
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={e => setData('csv_file', e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                    Required columns: <code className="bg-muted px-1 rounded">first_name</code>{' '}
                    <code className="bg-muted px-1 rounded">phone</code>. Optional: last_name, email, position, sector, member_status.
                </p>
                {errors.csv_file && <p className="text-sm text-destructive">{errors.csv_file}</p>}
            </div>

            <Button type="submit" disabled={processing} className="w-full">
                {processing ? 'Launching…' : 'Launch campaign'}
            </Button>
        </form>
    );
}

export default function CampaignsIndex({ campaigns: list }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Head title="Campaigns" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Campaigns</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Upload a prospect CSV and send personalised WhatsApp messages automatically.
                        </p>
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>New campaign</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>New campaign</DialogTitle>
                            </DialogHeader>
                            <NewCampaignForm onSuccess={() => setOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>

                {list.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-sidebar-border/70 text-center p-12">
                        <div className="space-y-2">
                            <p className="text-muted-foreground">No campaigns yet.</p>
                            <Button variant="outline" onClick={() => setOpen(true)}>
                                Create your first campaign
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {list.map(campaign => (
                            <Card
                                key={campaign.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => router.visit(campaigns.show.url(campaign.id))}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base leading-tight">{campaign.name}</CardTitle>
                                        <Badge variant={statusColors[campaign.status] as any}>
                                            {campaign.status}
                                        </Badge>
                                    </div>
                                    <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-between text-sm text-muted-foreground">
                                    <span>{campaign.prospects_count} prospects</span>
                                    <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

CampaignsIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Campaigns', href: campaigns.index.url() },
        ]}
    >
        {page}
    </AppLayout>
);
