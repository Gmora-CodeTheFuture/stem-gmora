import { ReactNode, useLayoutEffect, useRef, useState } from 'react';

export type SegmentedItem<T extends string | number = string> = {
    key: T;
    label: ReactNode;
};

type Props<T extends string | number> = {
    items: SegmentedItem<T>[];
    value: T;
    onChange: (key: T) => void;
    className?: string;
    'aria-label'?: string;
};

/**
 * Pill tab switcher with a sliding active indicator.
 */
export default function SegmentedControl<T extends string | number>({
    items,
    value,
    onChange,
    className = '',
    'aria-label': ariaLabel = 'Sections',
}: Props<T>) {
    const trackRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef(new Map<T, HTMLButtonElement>());
    const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

    const measure = () => {
        const track = trackRef.current;
        const btn = btnRefs.current.get(value);
        if (!track || !btn) {
            return;
        }

        const trackRect = track.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();

        setIndicator({
            left: btnRect.left - trackRect.left,
            width: btnRect.width,
            ready: true,
        });
    };

    const itemKeys = items.map((item) => String(item.key)).join('|');

    useLayoutEffect(() => {
        measure();

        const track = trackRef.current;
        if (!track || typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(measure);
        observer.observe(track);
        btnRefs.current.forEach((btn) => observer.observe(btn));
        window.addEventListener('resize', measure);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
        // Re-measure when the active tab or tab set changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, itemKeys]);

    return (
        <div
            ref={trackRef}
            role="tablist"
            aria-label={ariaLabel}
            className={`relative inline-flex p-1 rounded-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 ${className}`}
        >
            <span
                aria-hidden
                className={`pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white dark:bg-surface-800 shadow-card ${
                    indicator.ready
                        ? 'transition-[transform,width] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]'
                        : ''
                }`}
                style={{
                    width: indicator.width,
                    transform: `translateX(${indicator.left}px)`,
                }}
            />

            {items.map((item) => {
                const active = item.key === value;

                return (
                    <button
                        key={String(item.key)}
                        ref={(el) => {
                            if (el) {
                                btnRefs.current.set(item.key, el);
                            } else {
                                btnRefs.current.delete(item.key);
                            }
                        }}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(item.key)}
                        className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                            active
                                ? 'text-surface-900 dark:text-white'
                                : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
                        }`}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
