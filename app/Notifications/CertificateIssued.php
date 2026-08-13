<?php

namespace App\Notifications;

use App\Models\Certificate;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent when a course reaches 100% and the certificate job runs (Plan §8.8).
 */
class CertificateIssued extends Notification
{
    use Queueable;

    public function __construct(private readonly Certificate $certificate) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Certificate earned',
            'body' => "You completed \"{$this->certificate->course?->title}\". Your certificate is ready.",
            'url' => route('certificate.verify', $this->certificate->certificate_code),
            'icon' => 'award',
        ];
    }
}
