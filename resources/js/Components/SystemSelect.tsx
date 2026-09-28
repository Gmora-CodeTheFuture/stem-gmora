import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SystemSelectOption = {
    value: string;
    label: string;
};

type SystemSelectProps = {
    value: string;
    onValueChange: (value: string) => void;
    options: SystemSelectOption[];
    placeholder?: string;
    'aria-label'?: string;
    id?: string;
    className?: string;
    triggerClassName?: string;
    disabled?: boolean;
};

/** Site-palette select: white panel, primary blue highlight, leading check. */
export default function SystemSelect({
    value,
    onValueChange,
    options,
    placeholder = 'Select…',
    'aria-label': ariaLabel,
    id,
    className,
    triggerClassName,
    disabled,
}: SystemSelectProps) {
    return (
        <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
            <Select.Trigger
                id={id}
                aria-label={ariaLabel}
                className={cn(
                    'input inline-flex items-center justify-between gap-2 text-left',
                    'data-[placeholder]:text-surface-400',
                    triggerClassName,
                )}
            >
                <Select.Value placeholder={placeholder} />
                <Select.Icon className="shrink-0 text-surface-400">
                    <ChevronDown className="w-4 h-4" />
                </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
                <Select.Content
                    position="popper"
                    sideOffset={6}
                    collisionPadding={12}
                    className={cn('system-menu z-[80] min-w-[var(--radix-select-trigger-width)]', className)}
                >
                    <Select.Viewport className="system-menu-viewport">
                        {options.map((option) => (
                            <Select.Item
                                key={option.value}
                                value={option.value}
                                className="system-menu-item"
                            >
                                <Select.ItemIndicator className="system-menu-check">
                                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                </Select.ItemIndicator>
                                <Select.ItemText>{option.label}</Select.ItemText>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
}
