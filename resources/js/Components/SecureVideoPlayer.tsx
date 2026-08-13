import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Lock, RotateCw } from 'lucide-react';
import { VideoTicket } from '@/types';

/**
 * [v2] Token-gated YouTube player (Plan §8.4).
 *
 * The page it lives on never receives a video ID. This component mounts an
 * empty shell, fetches a ticket over XHR, and only then builds the iframe —
 * so the raw ID is absent from page source and SSR HTML. A heartbeat
 * re-validates the ticket every 60s; a revoked enrollment (refund, logout
 * elsewhere) stops playback within one interval rather than "next login".
 */

const HEARTBEAT_MS = 60_000;
const PROGRESS_POLL_MS = 10_000;
const AUTO_COMPLETE_AT = 90;

interface Props {
    lessonId: string;
    title: string;
    /** Percentage already watched, used to resume where the student left off. */
    initialPercentage?: number;
    onProgress?: (percentage: number, completed: boolean) => void;
}

type Status = 'idle' | 'loading' | 'ready' | 'blocked' | 'error';

// Minimal shape of the bits of the IFrame Player API we use.
interface YTPlayer {
    destroy(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
}

declare global {
    interface Window {
        YT?: {
            Player: new (el: HTMLElement | string, options: Record<string, unknown>) => YTPlayer;
            loaded?: number;
        };
        onYouTubeIframeAPIReady?: () => void;
    }
}

/** Laravel's CSRF cookie, which Inertia/axios normally reads for us. */
function xsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/** Load the IFrame API once per page, shared across player mounts. */
let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
    if (window.YT?.Player) return Promise.resolve();

    if (!apiPromise) {
        apiPromise = new Promise<void>((resolve) => {
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previous?.();
                resolve();
            };

            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            document.head.appendChild(script);
        });
    }

    return apiPromise;
}

export default function SecureVideoPlayer({ lessonId, title, initialPercentage = 0, onProgress }: Props) {
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState<string>('');
    const [watermark, setWatermark] = useState<string>('');

    const mountRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const ticketRef = useRef<string | null>(null);
    const highestRef = useRef<number>(initialPercentage);
    const completedRef = useRef<boolean>(initialPercentage >= AUTO_COMPLETE_AT);

    const stopPlayback = useCallback((reason: string) => {
        playerRef.current?.pauseVideo();
        setStatus('blocked');
        setMessage(reason);
    }, []);

    /** Fetch a ticket and build the player. */
    const start = useCallback(async () => {
        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch(`/api/v1/learning/lessons/${lessonId}/video-token`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (response.status === 403) {
                setStatus('blocked');
                setMessage('Your access to this lesson is no longer active.');
                return;
            }

            if (response.status === 429) {
                setStatus('error');
                setMessage('Too many playback requests. Wait a moment and try again.');
                return;
            }

            if (!response.ok) {
                throw new Error(`Token request failed (${response.status})`);
            }

            const { data } = (await response.json()) as { data: VideoTicket };

            ticketRef.current = data.ticket;
            setWatermark(data.watermark);

            await loadYouTubeApi();

            if (!mountRef.current) return;

            playerRef.current?.destroy();
            playerRef.current = new window.YT!.Player(mountRef.current, {
                videoId: data.video_id,
                playerVars: {
                    // Domain-locked embed (Plan §3.1) — the player only talks
                    // to the API when served from our own origin.
                    origin: window.location.origin,
                    enablejsapi: 1,
                    playsinline: 1,
                    rel: 0,
                    modestbranding: 1,
                },
                events: {
                    onReady: (event: { target: YTPlayer }) => {
                        setStatus('ready');

                        if (initialPercentage > 0 && initialPercentage < AUTO_COMPLETE_AT) {
                            const duration = event.target.getDuration();
                            if (duration > 0) {
                                event.target.seekTo((initialPercentage / 100) * duration, true);
                            }
                        }
                    },
                    onError: () => {
                        setStatus('error');
                        setMessage('This video could not be loaded. Please contact your instructor.');
                    },
                },
            });
        } catch {
            setStatus('error');
            setMessage('We could not start this lesson. Check your connection and try again.');
        }
    }, [lessonId, initialPercentage]);

    useEffect(() => {
        void start();

        return () => {
            playerRef.current?.destroy();
            playerRef.current = null;
            ticketRef.current = null;
        };
    }, [start]);

    /** Heartbeat: re-validate the ticket while playback is live. */
    useEffect(() => {
        if (status !== 'ready') return;

        const interval = window.setInterval(async () => {
            const ticket = ticketRef.current;
            if (!ticket) return;

            try {
                const response = await fetch(`/api/v1/learning/video-token/${ticket}/heartbeat`, {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });

                if (response.ok) return;

                const body = await response.json().catch(() => null);
                const reason = body?.data?.reason;

                stopPlayback(
                    reason === 'enrollment_inactive'
                        ? 'Your enrollment in this course is no longer active.'
                        : 'This playback session expired. Reload to continue watching.',
                );
            } catch {
                // A transient network blip should not interrupt a lesson;
                // the next beat decides.
            }
        }, HEARTBEAT_MS);

        return () => window.clearInterval(interval);
    }, [status, stopPlayback]);

    /** Progress reporting, with auto-complete at 90% watched (Plan §8.3). */
    useEffect(() => {
        if (status !== 'ready' || !onProgress) return;

        const interval = window.setInterval(() => {
            const player = playerRef.current;
            if (!player) return;

            const duration = player.getDuration();
            if (!duration) return;

            const percentage = Math.min((player.getCurrentTime() / duration) * 100, 100);
            if (percentage <= highestRef.current + 0.5) return;

            highestRef.current = percentage;
            const completed = percentage >= AUTO_COMPLETE_AT;
            const firstCompletion = completed && !completedRef.current;
            completedRef.current = completedRef.current || completed;

            onProgress(Math.round(percentage * 100) / 100, firstCompletion);
        }, PROGRESS_POLL_MS);

        return () => window.clearInterval(interval);
    }, [status, onProgress]);

    return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-surface-950 border border-surface-800">
            {/* The iframe replaces this node once a ticket is in hand. */}
            <div ref={mountRef} className="absolute inset-0 w-full h-full" />

            {status !== 'ready' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-surface-950">
                    {status === 'loading' || status === 'idle' ? (
                        <>
                            <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
                            <p className="text-sm text-surface-400">Verifying your access to “{title}”…</p>
                        </>
                    ) : (
                        <>
                            {status === 'blocked' ? (
                                <Lock className="w-7 h-7 text-amber-400" />
                            ) : (
                                <AlertTriangle className="w-7 h-7 text-red-400" />
                            )}
                            <p className="text-sm text-surface-300 max-w-sm">{message}</p>
                            <button onClick={() => void start()} className="btn-secondary mt-1 px-4 py-2 text-sm">
                                <RotateCw className="w-4 h-4" />
                                Try again
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Leak-tracing overlay — deterrence and traceability, not DRM. */}
            {status === 'ready' && watermark && (
                <div className="pointer-events-none absolute bottom-14 right-4 select-none text-[11px] font-mono tracking-wide text-white/25">
                    {watermark}
                </div>
            )}
        </div>
    );
}
