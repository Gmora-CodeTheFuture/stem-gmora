<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PaymentManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Payment::with([
            'user:id,full_name,email',
            'course:id,title',
        ]);

        if ($search = $request->input('search')) {
            $query->whereHas('user', fn ($q) => $q->whereLike('full_name', "%{$search}%"));
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $payments = $query->latest()->paginate(20)->withQueryString();

        $totalRevenue = Payment::where('status', 'completed')->sum('amount');
        $monthlyRevenue = Payment::where('status', 'completed')
            ->where('created_at', '>=', Carbon::now()->startOfMonth())
            ->sum('amount');
        $totalRefunds = Payment::where('status', 'refunded')->sum('amount');

        return Inertia::render('Admin/Payments/Index', [
            'payments' => $payments,
            'summary' => [
                'total_revenue' => round($totalRevenue, 2),
                'monthly_revenue' => round($monthlyRevenue, 2),
                'total_refunds' => round($totalRefunds, 2),
            ],
            'filters' => $request->only(['search', 'status']),
        ]);
    }
}
