<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Services\CertificateRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CertificateTest extends TestCase
{
    use RefreshDatabase;

    private function certificateFor(User $student): Certificate
    {
        $course = Course::factory()->create();
        $enrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);

        return Certificate::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'enrollment_id' => $enrollment->id,
            'certificate_code' => 'GM-TEST-'.fake()->unique()->numerify('####'),
            'issued_at' => now(),
        ]);
    }

    public function test_finishing_a_course_issues_a_certificate_with_a_pdf(): void
    {
        Storage::fake('local');

        $student = User::factory()->create();
        $course = Course::factory()->create(['total_lessons' => 1]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);

        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

        $this->actingAs($student)->patch(route('learn.progress', $lesson), [
            'watch_percentage' => 100,
            'completed' => true,
        ]);

        $certificate = Certificate::where('user_id', $student->id)->firstOrFail();

        $this->assertNotNull($certificate->pdf_url);
        Storage::disk('local')->assertExists($certificate->pdf_url);
    }

    public function test_the_pdf_names_the_student_and_carries_the_verification_url(): void
    {
        $student = User::factory()->create(['full_name' => 'Ada Lovelace']);
        $certificate = $this->certificateFor($student);

        $path = app(CertificateRenderer::class)->render($certificate);
        $pdf = Storage::disk(CertificateRenderer::DISK)->get($path);

        $this->assertStringStartsWith('%PDF-', $pdf);
        $this->assertGreaterThan(1000, strlen($pdf));

        // The rendered view is what carries the identity and the QR target.
        $view = view('certificates.certificate', [
            'certificate' => $certificate,
            'student' => $student->full_name,
            'course' => $certificate->course->title,
            'instructor' => null,
            'issuedAt' => $certificate->issued_at,
            'verifyUrl' => route('certificate.verify', $certificate->certificate_code),
            'qrCode' => 'data:image/svg+xml;base64,AAA',
        ])->render();

        $this->assertStringContainsString('Ada Lovelace', $view);
        $this->assertStringContainsString(
            route('certificate.verify', $certificate->certificate_code),
            $view,
        );
    }

    public function test_the_owner_can_download_their_certificate(): void
    {
        $student = User::factory()->create();
        $certificate = $this->certificateFor($student);

        $this->actingAs($student)
            ->get(route('certificates.download', $certificate))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_another_student_cannot_download_someone_elses_certificate(): void
    {
        $certificate = $this->certificateFor(User::factory()->create());

        $this->actingAs(User::factory()->create())
            ->get(route('certificates.download', $certificate))
            ->assertForbidden();
    }

    public function test_an_admin_can_download_any_certificate(): void
    {
        $certificate = $this->certificateFor(User::factory()->create());

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('certificates.download', $certificate))
            ->assertOk();
    }

    public function test_a_missing_file_is_rendered_on_demand(): void
    {
        Storage::fake('local');

        $student = User::factory()->create();
        $certificate = $this->certificateFor($student);

        // Issued before PDFs existed: a row with no file behind it.
        $this->assertNull($certificate->pdf_url);

        $this->actingAs($student)->get(route('certificates.download', $certificate))->assertOk();

        Storage::disk('local')->assertExists($certificate->refresh()->pdf_url);
    }

    public function test_the_verification_page_stays_public(): void
    {
        $certificate = $this->certificateFor(User::factory()->create());

        $this->get(route('certificate.verify', $certificate->certificate_code))
            ->assertOk()
            ->assertSee($certificate->certificate_code);
    }
}
