<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Services\CertificateRenderer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CertificateController extends Controller
{
    public function __construct(private readonly CertificateRenderer $renderer) {}

    public function index(Request $request): Response
    {
        $certificates = Certificate::where('user_id', $request->user()->id)
            ->with('course:id,title,slug,category')
            ->latest('issued_at')
            ->get()
            ->map(fn (Certificate $certificate) => [
                'id' => $certificate->id,
                'certificate_code' => $certificate->certificate_code,
                'issued_at' => $certificate->issued_at->toIso8601String(),
                'has_pdf' => true,
                'course' => $certificate->course?->only(['id', 'title', 'slug', 'category']),
            ]);

        return Inertia::render('Dashboard/Certificates', [
            'certificates' => $certificates,
        ]);
    }

    /**
     * Stream the PDF. A certificate names a student, so only its owner or an
     * admin may download it — the public page verifies without disclosing it.
     */
    public function download(Request $request, Certificate $certificate)
    {
        abort_unless(
            $certificate->user_id === $request->user()->id || $request->user()->isAdmin(),
            403,
        );

        $path = $this->renderer->ensure($certificate);

        return Storage::disk(CertificateRenderer::DISK)->download(
            $path,
            "gmora-certificate-{$certificate->certificate_code}.pdf",
        );
    }
}
