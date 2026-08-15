<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Services\YouTubeVideoId;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Attaching media to a lesson.
 *
 * All three of these were reported together: a YouTube share link stored
 * verbatim so the player never started, no way to attach a PDF at all, and an
 * unlabelled icon as the only route to uploading a presentation.
 */
class LessonMediaTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Module $module;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();

        $course = Course::factory()->create(['instructor_id' => $this->admin->id]);
        $this->module = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);
    }

    /** @return array<int, array{0: string, 1: string|null}> */
    public static function youtubeInputs(): array
    {
        return [
            'share link' => ['https://youtu.be/Q8Ok6RCKnNg?si=3Wn3Z1g2Ku7sOXWu', 'Q8Ok6RCKnNg'],
            'watch url' => ['https://www.youtube.com/watch?v=aircAruvnKk&t=42s', 'aircAruvnKk'],
            'embed url' => ['https://www.youtube.com/embed/aircAruvnKk', 'aircAruvnKk'],
            'shorts url' => ['https://youtube.com/shorts/aircAruvnKk', 'aircAruvnKk'],
            'no scheme' => ['youtu.be/aircAruvnKk', 'aircAruvnKk'],
            'bare id' => ['aircAruvnKk', 'aircAruvnKk'],
            'with spaces' => ['  aircAruvnKk  ', 'aircAruvnKk'],
            'not youtube' => ['https://vimeo.com/12345', null],
            'nonsense' => ['have a nice day', null],
            'empty' => ['', null],
        ];
    }

    #[DataProvider('youtubeInputs')]
    public function test_it_extracts_the_video_id_from_what_people_paste(string $input, ?string $expected): void
    {
        $this->assertSame($expected, YouTubeVideoId::fromInput($input));
    }

    public function test_a_pasted_share_link_is_stored_as_a_bare_id(): void
    {
        $this->actingAs($this->admin)
            ->post(route('tutor.lessons.store', $this->module), [
                'title' => 'Intro',
                'type' => 'youtube',
                'content_ref' => 'https://youtu.be/Q8Ok6RCKnNg?si=3Wn3Z1g2Ku7sOXWu',
                'duration_seconds' => 600,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('Q8Ok6RCKnNg', Lesson::firstOrFail()->getRawOriginal('content_ref'));
    }

    public function test_an_unusable_video_link_is_rejected_with_an_explanation(): void
    {
        $this->actingAs($this->admin)
            ->post(route('tutor.lessons.store', $this->module), [
                'title' => 'Intro',
                'type' => 'youtube',
                'content_ref' => 'https://vimeo.com/12345',
            ])
            ->assertSessionHasErrors('content_ref');

        $this->assertSame(0, Lesson::count());
    }

    public function test_a_pdf_can_be_attached_and_read_by_an_enrolled_student(): void
    {
        Storage::fake('private');

        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_PDF,
            'content_ref' => null,
            'is_published' => true,
        ]);

        $this->actingAs($this->admin)
            ->post(route('tutor.lessons.pdf.upload', $lesson), [
                'pdf_file' => UploadedFile::fake()->create('worksheet.pdf', 120, 'application/pdf'),
            ])
            ->assertSessionHasNoErrors();

        $stored = $lesson->refresh()->getRawOriginal('content_ref');

        $this->assertNotNull($stored);
        Storage::disk('private')->assertExists($stored);

        // The document is private: only an enrolled student may read it.
        $student = User::factory()->create();
        $this->actingAs($student)->get(route('lesson.pdf', $lesson))->assertForbidden();

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $this->module->course_id,
            'status' => Enrollment::STATUS_ACTIVE,
            'enrolled_at' => now(),
        ]);

        $this->actingAs($student)
            ->get(route('lesson.pdf', $lesson))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_replacing_a_pdf_removes_the_old_file(): void
    {
        Storage::fake('private');

        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_PDF,
            'content_ref' => null,
        ]);

        $this->actingAs($this->admin)->post(route('tutor.lessons.pdf.upload', $lesson), [
            'pdf_file' => UploadedFile::fake()->create('first.pdf', 10, 'application/pdf'),
        ]);

        $first = $lesson->refresh()->getRawOriginal('content_ref');

        $this->actingAs($this->admin)->post(route('tutor.lessons.pdf.upload', $lesson), [
            'pdf_file' => UploadedFile::fake()->create('second.pdf', 10, 'application/pdf'),
        ]);

        $second = $lesson->refresh()->getRawOriginal('content_ref');

        $this->assertNotSame($first, $second);
        Storage::disk('private')->assertMissing($first);
        Storage::disk('private')->assertExists($second);
    }

    public function test_only_a_pdf_is_accepted(): void
    {
        Storage::fake('private');

        $lesson = Lesson::factory()->create(['module_id' => $this->module->id, 'type' => Lesson::TYPE_PDF]);

        $this->actingAs($this->admin)
            ->post(route('tutor.lessons.pdf.upload', $lesson), [
                'pdf_file' => UploadedFile::fake()->create('sneaky.php', 10, 'text/x-php'),
            ])
            ->assertSessionHasErrors('pdf_file');
    }

    public function test_a_student_cannot_upload_a_document(): void
    {
        Storage::fake('private');

        $lesson = Lesson::factory()->create(['module_id' => $this->module->id, 'type' => Lesson::TYPE_PDF]);

        $this->actingAs(User::factory()->create())
            ->post(route('tutor.lessons.pdf.upload', $lesson), [
                'pdf_file' => UploadedFile::fake()->create('worksheet.pdf', 10, 'application/pdf'),
            ])
            ->assertForbidden();
    }

    public function test_a_course_cover_can_be_uploaded(): void
    {
        Storage::fake('public');

        $course = Course::find($this->module->course_id);

        $this->actingAs($this->admin)
            ->post(route('tutor.courses.image', $course), [
                'image' => UploadedFile::fake()->image('cover.jpg', 1200, 630),
            ])
            ->assertSessionHasNoErrors();

        $url = $course->refresh()->thumbnail_url;

        $this->assertStringContainsString('course-covers/', $url);
        Storage::disk('public')->assertExists('course-covers/'.basename($url));
    }

    public function test_a_cover_must_be_an_image(): void
    {
        Storage::fake('public');

        $course = Course::find($this->module->course_id);

        $this->actingAs($this->admin)
            ->post(route('tutor.courses.image', $course), [
                'image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
            ])
            ->assertSessionHasErrors('image');
    }
}
