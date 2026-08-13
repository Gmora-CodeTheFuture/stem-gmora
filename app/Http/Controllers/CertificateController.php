<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CertificateController extends Controller
{
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
                'pdf_url' => $certificate->pdf_url,
                'course' => $certificate->course?->only(['id', 'title', 'slug', 'category']),
            ]);

        return Inertia::render('Dashboard/Certificates', [
            'certificates' => $certificates,
        ]);
    }
}
