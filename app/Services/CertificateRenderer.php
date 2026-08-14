<?php

namespace App\Services;

use App\Models\Certificate;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Renders the certificate PDF (Plan §4.7).
 *
 * The QR points at the public verification URL, so anyone holding the PDF can
 * check it against the platform without an account. Files live on the private
 * disk and are served through an authorising controller — a certificate names
 * a student, so it is not world-readable by URL guess.
 */
class CertificateRenderer
{
    public const DISK = 'local';

    /** Render (or re-render) the PDF and store it. Returns the storage path. */
    public function render(Certificate $certificate): string
    {
        $certificate->loadMissing(['user', 'course.instructor']);

        $verifyUrl = route('certificate.verify', $certificate->certificate_code);

        $pdf = Pdf::loadView('certificates.certificate', [
            'certificate' => $certificate,
            'student' => $certificate->user?->full_name ?? 'Student',
            'course' => $certificate->course?->title ?? 'Course',
            'instructor' => $certificate->course?->instructor?->full_name,
            'issuedAt' => $certificate->issued_at,
            'verifyUrl' => $verifyUrl,
            'qrCode' => $this->qrCode($verifyUrl),
        ])->setPaper('a4', 'landscape');

        $path = $this->pathFor($certificate);

        Storage::disk(self::DISK)->put($path, $pdf->output());

        $certificate->forceFill(['pdf_url' => $path])->save();

        return $path;
    }

    /** The stored PDF, rendering it on first request if it is missing. */
    public function ensure(Certificate $certificate): string
    {
        $path = $certificate->pdf_url;

        if ($path && Storage::disk(self::DISK)->exists($path)) {
            return $path;
        }

        return $this->render($certificate);
    }

    public function pathFor(Certificate $certificate): string
    {
        return "certificates/{$certificate->certificate_code}.pdf";
    }

    /** Inline SVG QR as a data URI — dompdf renders it through php-svg-lib. */
    private function qrCode(string $url): string
    {
        $writer = new Writer(new ImageRenderer(new RendererStyle(240, 1), new SvgImageBackEnd));

        return 'data:image/svg+xml;base64,'.base64_encode($writer->writeString($url));
    }
}
