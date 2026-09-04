<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\PromoCode;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Promo codes are ready for the checkout seam even though card payment is not
 * wired yet — admins can stage discounts ahead of a processor.
 */
class PromoCodeController extends Controller
{
    public function index(): Response
    {
        $codes = PromoCode::with('course:id,title')
            ->latest()
            ->get()
            ->map(fn (PromoCode $code) => [
                'id' => $code->id,
                'code' => $code->code,
                'type' => $code->type,
                'value' => (float) $code->value,
                'currency' => $code->currency,
                'course_id' => $code->course_id,
                'course_title' => $code->course?->title,
                'max_uses' => $code->max_uses,
                'current_uses' => $code->current_uses,
                'valid_from' => $code->valid_from?->format('Y-m-d\TH:i'),
                'valid_until' => $code->valid_until?->format('Y-m-d\TH:i'),
                'is_active' => $code->is_active,
            ]);

        return Inertia::render('Admin/PromoCodes/Index', [
            'promoCodes' => $codes,
            'courses' => Course::where('status', Course::STATUS_PUBLISHED)
                ->orderBy('title')
                ->get(['id', 'title']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);

        $code = PromoCode::create($validated);

        AuditLog::record('promo_code.created', 'promo_code', $code->id, [
            'code' => $code->code,
        ], $request->user()->id);

        return Redirect::back()->with('success', "Promo code \"{$code->code}\" created.");
    }

    public function update(Request $request, PromoCode $promoCode): RedirectResponse
    {
        $validated = $this->validated($request, $promoCode);

        $promoCode->update($validated);

        AuditLog::record('promo_code.updated', 'promo_code', $promoCode->id, [
            'code' => $promoCode->code,
        ], $request->user()->id);

        return Redirect::back()->with('success', "Promo code \"{$promoCode->code}\" updated.");
    }

    public function destroy(Request $request, PromoCode $promoCode): RedirectResponse
    {
        $label = $promoCode->code;
        $promoCode->delete();

        AuditLog::record('promo_code.deleted', 'promo_code', $promoCode->id, [
            'code' => $label,
        ], $request->user()->id);

        return Redirect::back()->with('success', "Promo code \"{$label}\" deleted.");
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?PromoCode $existing = null): array
    {
        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('promo_codes', 'code')->ignore($existing?->id),
            ],
            'type' => ['required', 'in:percentage,fixed'],
            'value' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'course_id' => ['nullable', 'uuid', 'exists:courses,id'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $validated['is_active'] = $request->boolean('is_active', true);
        $validated['course_id'] = $validated['course_id'] ?? null;
        $validated['max_uses'] = $validated['max_uses'] ?? null;
        $validated['valid_from'] = $validated['valid_from'] ?? null;
        $validated['valid_until'] = $validated['valid_until'] ?? null;

        return $validated;
    }
}
