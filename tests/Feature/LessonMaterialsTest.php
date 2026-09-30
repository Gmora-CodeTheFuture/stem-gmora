<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonMaterial;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LessonMaterialsTest extends TestCase
{
    use RefreshDatabase;

    private User $tutor;

    private Course $course;

    private Module $module;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tutor = User::factory()->admin()->create();
        $this->course = Course::factory()->create([
            'instructor_id' => $this->tutor->id,
            'status' => 'published',
        ]);
        $this->module = Module::factory()->create([
            'course_id' => $this->course->id,
            'is_published' => true,
        ]);
    }

    public function test_tutor_can_add_multiple_materials_to_one_lesson(): void
    {
        $this->actingAs($this->tutor)
            ->post(route('tutor.lessons.store', $this->module), [
                'title' => 'Introduction to Python',
                'type' => 'youtube',
                'content_ref' => 'aircAruvnKk',
                'duration_seconds' => 600,
            ])
            ->assertSessionHasNoErrors();

        $lesson = Lesson::firstOrFail();
        $this->assertSame(1, $lesson->materials()->count());

        $this->actingAs($this->tutor)
            ->post(route('tutor.materials.store', $lesson), [
                'type' => 'pdf',
                'title' => 'Slides PDF',
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($this->tutor)
            ->post(route('tutor.materials.store', $lesson), [
                'type' => 'live',
                'title' => 'Office hours',
            ])
            ->assertSessionHasNoErrors();

        $types = $lesson->fresh()->materials()->orderBy('order_index')->pluck('type')->all();
        $this->assertSame(['youtube', 'pdf', 'live'], $types);
    }

    public function test_student_payload_lists_only_present_materials(): void
    {
        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_YOUTUBE,
            'content_ref' => 'aircAruvnKk',
            'is_published' => true,
            'title' => 'Intro topic',
        ]);

        LessonMaterial::factory()->create([
            'lesson_id' => $lesson->id,
            'type' => LessonMaterial::TYPE_YOUTUBE,
            'title' => 'Walkthrough',
            'order_index' => 0,
            'content_ref' => 'aircAruvnKk',
        ]);

        LessonMaterial::factory()->pdf()->create([
            'lesson_id' => $lesson->id,
            'title' => 'Handout',
            'order_index' => 1,
        ]);

        $this->course->update(['total_lessons' => 1]);

        $student = User::factory()->create();
        Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $this->course->id,
        ]);

        $this->actingAs($student)
            ->get(route('learn.lesson', [$this->course, $lesson]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Learn/Show')
                ->has('currentLesson.materials', 2)
                ->where('currentLesson.materials.0.type', 'youtube')
                ->where('currentLesson.materials.1.type', 'pdf')
                ->where('currentLesson.materials.0.has_video', true)
                ->where('currentLesson.materials.1.has_pdf', true)
                ->missing('currentLesson.materials.0.content_ref')
            );
    }

    public function test_legacy_lesson_without_material_rows_still_synthesizes_one(): void
    {
        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_YOUTUBE,
            'content_ref' => 'Q8Ok6RCKnNg',
            'is_published' => true,
        ]);

        $this->assertSame(0, $lesson->materials()->count());

        $resolved = $lesson->resolvedMaterials();
        $this->assertCount(1, $resolved);
        $this->assertSame('youtube', $resolved->first()->type);
        $this->assertTrue(str_starts_with((string) $resolved->first()->id, 'legacy-'));

        $this->course->update(['total_lessons' => 1]);
        $student = User::factory()->create();
        Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $this->course->id,
        ]);

        $this->actingAs($student)
            ->get(route('learn.lesson', [$this->course, $lesson]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('currentLesson.materials', 1)
                ->where('currentLesson.materials.0.type', 'youtube')
                ->where('currentLesson.materials.0.has_video', true)
                ->where('currentLesson.materials.0.legacy', true)
            );
    }

    public function test_empty_material_types_are_not_listed_as_ready_flags(): void
    {
        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_YOUTUBE,
            'content_ref' => null,
            'is_published' => true,
        ]);

        LessonMaterial::factory()->create([
            'lesson_id' => $lesson->id,
            'type' => LessonMaterial::TYPE_YOUTUBE,
            'order_index' => 0,
            'content_ref' => 'aircAruvnKk',
        ]);

        // Incomplete PDF — still in DB but student panel filters by has_pdf.
        LessonMaterial::factory()->create([
            'lesson_id' => $lesson->id,
            'type' => LessonMaterial::TYPE_PDF,
            'order_index' => 1,
            'content_ref' => null,
            'title' => 'Missing file',
        ]);

        $payload = $lesson->fresh()->resolvedMaterials()->map->toStudentArray()->all();
        $this->assertCount(2, $payload);
        $this->assertTrue($payload[0]['has_video']);
        $this->assertFalse($payload[1]['has_pdf']);
        $this->assertFalse(collect($payload)->contains(fn ($m) => ($m['type'] ?? '') === 'html'));
    }

    public function test_publish_blocker_accepts_any_ready_material(): void
    {
        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_YOUTUBE,
            'content_ref' => null,
            'is_published' => false,
        ]);

        LessonMaterial::factory()->pdf()->create([
            'lesson_id' => $lesson->id,
            'order_index' => 0,
        ]);

        $blocker = app(\App\Services\CourseContentService::class)->publishBlocker($lesson->fresh());
        $this->assertNull($blocker);
    }

    public function test_adding_a_material_to_a_legacy_lesson_keeps_the_original(): void
    {
        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_YOUTUBE,
            'content_ref' => 'Q8Ok6RCKnNg',
            'is_published' => true,
        ]);

        $this->assertSame(0, $lesson->materials()->count());

        $this->actingAs($this->tutor)
            ->post(route('tutor.materials.store', $lesson), [
                'type' => 'pdf',
                'title' => 'Handout',
            ])
            ->assertSessionHasNoErrors();

        $materials = $lesson->fresh()->materials()->orderBy('order_index')->get();
        $this->assertCount(2, $materials);
        $this->assertSame('youtube', $materials[0]->type);
        $this->assertSame('Q8Ok6RCKnNg', $materials[0]->rawContentRef());
        $this->assertSame('pdf', $materials[1]->type);
        $this->assertSame('Handout', $materials[1]->title);
    }

    public function test_enrolled_student_can_view_html_material_presentation(): void
    {
        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_HTML,
            'content_ref' => null,
            'is_published' => true,
        ]);

        $disk = \Illuminate\Support\Facades\Storage::fake(\App\Services\PresentationService::DISK);
        $storagePath = 'presentations/test-html-material';
        $disk->put("{$storagePath}/index.html", '<html><body>Hello deck</body></html>');

        $material = LessonMaterial::factory()->html()->create([
            'lesson_id' => $lesson->id,
            'title' => 'Introduction to Python',
            'order_index' => 0,
            'storage_path' => $storagePath,
            'entry_file' => 'index.html',
            'original_filename' => '01-introduction.html',
            'file_size' => 100,
        ]);

        $student = User::factory()->create();
        Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $this->course->id,
        ]);

        $this->actingAs($student)
            ->get(route('presentation.material.show', $material))
            ->assertOk()
            ->assertSee('Hello deck', false);
    }
}
