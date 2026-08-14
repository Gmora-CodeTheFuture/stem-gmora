<?php

namespace App\Jobs;

use App\Models\AuditLog;
use App\Models\Certificate;
use App\Models\Enrollment;
use App\Notifications\CertificateIssued;
use App\Services\CertificateRenderer;
use App\Services\DashboardCache;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

/**
 * Queued on 100% course completion (Plan §8.8). Issues the certificate row and
 * its verification code, then renders the PDF carrying a QR that points at the
 * public /verify/{code} page.
 */
class GenerateCertificate implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $enrollmentId) {}

    public function handle(): void
    {
        $enrollment = Enrollment::with('course')->find($this->enrollmentId);

        if (! $enrollment || $enrollment->status !== Enrollment::STATUS_COMPLETED) {
            return;
        }

        $certificate = Certificate::firstOrCreate(
            [
                'user_id' => $enrollment->user_id,
                'course_id' => $enrollment->course_id,
            ],
            [
                'enrollment_id' => $enrollment->id,
                'certificate_code' => $this->generateCode(),
                'issued_at' => now(),
            ]
        );

        // Render the PDF whether the row is new or was issued before PDFs
        // existed, so every certificate ends up with a downloadable file.
        app(CertificateRenderer::class)->ensure($certificate);

        if ($certificate->wasRecentlyCreated) {
            AuditLog::record(
                'certificate.issued',
                'certificate',
                $certificate->id,
                ['course_id' => $enrollment->course_id],
                $enrollment->user_id,
            );

            $enrollment->user?->notify(new CertificateIssued($certificate->load('course')));
            DashboardCache::forget($enrollment->user_id);
        }
    }

    private function generateCode(): string
    {
        do {
            $code = 'GM-'.Str::upper(Str::random(4)).'-'.Str::upper(Str::random(4));
        } while (Certificate::where('certificate_code', $code)->exists());

        return $code;
    }
}
