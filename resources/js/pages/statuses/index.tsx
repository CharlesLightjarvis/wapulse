import { Head, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as statusRoutes from '@/routes/statuses';

interface WaStatus {
    id: string;
    body?: string;
    caption?: string;
    type?: string;
    timestamp?: number;
    from?: string;
}

interface Props {
    statuses: WaStatus[];
    error: string | null;
}

const FONTS = ['Sans-serif', 'Serif', 'Monospace', 'Cursive', 'Impact'];

const COLORS = [
    { label: 'Black', value: '#000000' },
    { label: 'Navy', value: '#1e3a5f' },
    { label: 'Green', value: '#075E54' },
    { label: 'Purple', value: '#6a0dad' },
    { label: 'Red', value: '#c0392b' },
];

export default function StatusIndex({ statuses, error }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const { data, setData, post, processing, errors, reset } = useForm({
        text: '',
        background_color: '#000000',
        font: 0,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(statusRoutes.store.url(), {
            onSuccess: () => reset(),
        });
    }

    return (
        <>
            <Head title="WhatsApp Status" />
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
                <h1 className="text-2xl font-semibold">WhatsApp Status</h1>

                {flash?.success && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Post form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Post a status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-4"
                        >
                            <div className="space-y-1.5">
                                <Label htmlFor="text">Text</Label>
                                <Textarea
                                    id="text"
                                    rows={4}
                                    placeholder="Your status message…"
                                    value={data.text}
                                    onChange={(e) =>
                                        setData('text', e.target.value)
                                    }
                                    maxLength={700}
                                />
                                {errors.text && (
                                    <p className="text-xs text-destructive">
                                        {errors.text}
                                    </p>
                                )}
                                <p className="text-right text-xs text-muted-foreground">
                                    {data.text.length}/700
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-6">
                                <div className="space-y-1.5">
                                    <Label>Background</Label>
                                    <div className="flex gap-2">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                title={c.label}
                                                onClick={() =>
                                                    setData(
                                                        'background_color',
                                                        c.value,
                                                    )
                                                }
                                                className="size-8 rounded-full border-2 transition-all"
                                                style={{
                                                    backgroundColor: c.value,
                                                    borderColor:
                                                        data.background_color ===
                                                        c.value
                                                            ? 'white'
                                                            : 'transparent',
                                                    outline:
                                                        data.background_color ===
                                                        c.value
                                                            ? '2px solid #888'
                                                            : 'none',
                                                }}
                                            />
                                        ))}
                                        <input
                                            type="color"
                                            value={data.background_color}
                                            onChange={(e) =>
                                                setData(
                                                    'background_color',
                                                    e.target.value,
                                                )
                                            }
                                            className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                                            title="Custom color"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="font">Font</Label>
                                    <select
                                        id="font"
                                        value={data.font}
                                        onChange={(e) =>
                                            setData(
                                                'font',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="h-9 rounded-md border bg-background px-3 text-sm"
                                    >
                                        {FONTS.map((f, i) => (
                                            <option key={i} value={i}>
                                                {f}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Preview */}
                            {data.text && (
                                <div
                                    className="flex min-h-24 items-center justify-center rounded-lg p-6 text-center text-base text-white"
                                    style={{
                                        backgroundColor: data.background_color,
                                        fontFamily: [
                                            'sans-serif',
                                            'serif',
                                            'monospace',
                                            'cursive',
                                            'Impact',
                                        ][data.font],
                                    }}
                                >
                                    {data.text}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={processing || !data.text.trim()}
                            >
                                {processing ? 'Sending…' : 'Post status'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Existing statuses */}
                {statuses.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Active statuses ({statuses.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y">
                            {statuses.map((s) => (
                                <div key={s.id} className="py-3 text-sm">
                                    <p className="font-medium">
                                        {s.body ?? s.caption ?? '—'}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {s.type} ·{' '}
                                        {s.timestamp
                                            ? new Date(
                                                  s.timestamp * 1000,
                                              ).toLocaleString()
                                            : ''}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {statuses.length === 0 && !error && (
                    <p className="text-center text-sm text-muted-foreground">
                        No active statuses.
                    </p>
                )}
            </div>
        </>
    );
}
