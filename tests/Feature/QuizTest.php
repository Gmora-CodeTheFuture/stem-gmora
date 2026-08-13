<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Progress;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private Quiz $quiz;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->course = Course::factory()->create();
        $this->student = User::factory()->create();

        Enrollment::factory()->create([
            'user_id' => $this->student->id,
            'course_id' => $this->course->id,
        ]);

        $this->quiz = Quiz::create([
            'course_id' => $this->course->id,
            'title' => 'Test Quiz',
            'max_attempts' => 2,
            'passing_score' => 60,
            'is_published' => true,
        ]);
    }

    private function addQuestion(array $attributes = []): Question
    {
        return Question::create([
            'quiz_id' => $this->quiz->id,
            'type' => Question::TYPE_MCQ,
            'body' => 'Pick the right one',
            'options' => [['text' => 'Right', 'is_correct' => true], ['text' => 'Wrong']],
            'correct_answer' => [0],
            'points' => 1,
            'order_index' => 0,
            ...$attributes,
        ]);
    }

    private function startAttempt(): QuizAttempt
    {
        $this->actingAs($this->student)->post(route('quiz.start', $this->quiz));

        // Timestamps tie within a test run, so select the live attempt directly.
        return QuizAttempt::where('user_id', $this->student->id)
            ->where('status', QuizAttempt::STATUS_IN_PROGRESS)
            ->firstOrFail();
    }

    public function test_unenrolled_user_cannot_open_a_quiz(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('quiz.show', $this->quiz))
            ->assertForbidden();
    }

    public function test_the_answer_key_is_never_sent_while_an_attempt_is_live(): void
    {
        $this->addQuestion([
            'body' => 'Which capital city?',
            'options' => [['text' => 'Colombo', 'is_correct' => true], ['text' => 'Kandy']],
            'explanation' => 'Colombo is the commercial capital.',
        ]);

        $attempt = $this->startAttempt();

        $response = $this->actingAs($this->student)->get(route('quiz.attempt', $attempt));

        $response->assertOk()
            ->assertDontSee('is_correct')
            ->assertDontSee('correct_answer')
            ->assertDontSee('commercial capital');
    }

    public function test_objective_questions_are_auto_graded(): void
    {
        $mcq = $this->addQuestion();
        $trueFalse = $this->addQuestion([
            'type' => Question::TYPE_TRUE_FALSE,
            'body' => 'The sky is green',
            'options' => [['text' => 'True'], ['text' => 'False', 'is_correct' => true]],
            'correct_answer' => [1],
            'order_index' => 1,
        ]);
        $blank = $this->addQuestion([
            'type' => Question::TYPE_FILL_BLANK,
            'body' => 'Steepest-descent optimisation is called ______ descent',
            'options' => [],
            'correct_answer' => ['gradient'],
            'order_index' => 2,
        ]);

        $attempt = $this->startAttempt();

        $this->actingAs($this->student)->post(route('quiz.submit', $attempt), [
            'answers' => [
                $mcq->id => [0],          // correct
                $trueFalse->id => [0],    // wrong
                $blank->id => '  Gradient ', // correct, case and padding forgiven
            ],
        ])->assertRedirect(route('quiz.result', $attempt));

        $attempt->refresh();

        $this->assertSame(QuizAttempt::STATUS_GRADED, $attempt->status);
        $this->assertSame(2, $attempt->points_earned);
        $this->assertSame(3, $attempt->points_possible);
        $this->assertEqualsWithDelta(66.67, (float) $attempt->score, 0.01);
    }

    public function test_ordering_questions_require_the_exact_sequence(): void
    {
        $question = $this->addQuestion([
            'type' => Question::TYPE_ORDERING,
            'body' => 'Order the steps',
            'options' => [['text' => 'First'], ['text' => 'Second'], ['text' => 'Third']],
            'correct_answer' => [0, 1, 2],
        ]);

        $attempt = $this->startAttempt();

        $this->actingAs($this->student)->post(route('quiz.submit', $attempt), [
            'answers' => [$question->id => [0, 2, 1]],
        ]);

        $this->assertSame(0, $attempt->refresh()->points_earned);
    }

    public function test_an_essay_question_holds_the_attempt_for_instructor_review(): void
    {
        $mcq = $this->addQuestion();
        $essay = $this->addQuestion([
            'type' => Question::TYPE_ESSAY,
            'body' => 'Explain your reasoning',
            'options' => [],
            'correct_answer' => null,
            'order_index' => 1,
        ]);

        $attempt = $this->startAttempt();

        $this->actingAs($this->student)->post(route('quiz.submit', $attempt), [
            'answers' => [$mcq->id => [0], $essay->id => 'Because the data was imbalanced.'],
        ]);

        $attempt->refresh();

        $this->assertSame(QuizAttempt::STATUS_SUBMITTED, $attempt->status);
        $this->assertSame(1, $attempt->points_earned, 'Only the auto-gradable question is scored.');
    }

    public function test_attempts_are_capped(): void
    {
        $this->addQuestion();

        foreach (range(1, 2) as $i) {
            $attempt = $this->startAttempt();
            $this->actingAs($this->student)->post(route('quiz.submit', $attempt), ['answers' => []]);
        }

        $this->actingAs($this->student)
            ->post(route('quiz.start', $this->quiz))
            ->assertSessionHas('error');

        $this->assertSame(2, QuizAttempt::where('user_id', $this->student->id)->count());
    }

    public function test_starting_again_resumes_an_unfinished_attempt(): void
    {
        $this->addQuestion();

        $first = $this->startAttempt();

        $this->actingAs($this->student)
            ->post(route('quiz.start', $this->quiz))
            ->assertRedirect(route('quiz.attempt', $first));

        $this->assertSame(1, QuizAttempt::where('user_id', $this->student->id)->count());
    }

    public function test_answers_sent_after_the_time_limit_are_ignored(): void
    {
        $this->quiz->update(['time_limit_seconds' => 300]);
        $question = $this->addQuestion();

        $attempt = $this->startAttempt();

        // Autosaved in time…
        $this->actingAs($this->student)->patch(route('quiz.save', $attempt), [
            'answers' => [$question->id => [1]],
        ]);

        $this->travel(6)->minutes();

        // …then a late submission tries to swap in the right answer.
        $this->actingAs($this->student)->post(route('quiz.submit', $attempt), [
            'answers' => [$question->id => [0]],
        ]);

        $attempt->refresh();

        $this->assertSame(0, $attempt->points_earned);
        $this->assertSame([$question->id => [1]], $attempt->answers);
    }

    public function test_another_student_cannot_open_an_attempt(): void
    {
        $this->addQuestion();
        $attempt = $this->startAttempt();

        $intruder = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $intruder->id, 'course_id' => $this->course->id]);

        $this->actingAs($intruder)->get(route('quiz.attempt', $attempt))->assertForbidden();
    }

    public function test_passing_a_quiz_completes_its_lesson(): void
    {
        $module = Module::factory()->create(['course_id' => $this->course->id]);
        $lesson = Lesson::factory()->create([
            'module_id' => $module->id,
            'type' => Lesson::TYPE_QUIZ,
            'content_ref' => null,
        ]);
        $this->quiz->update(['lesson_id' => $lesson->id]);

        $question = $this->addQuestion();
        $attempt = $this->startAttempt();

        $this->actingAs($this->student)->post(route('quiz.submit', $attempt), [
            'answers' => [$question->id => [0]],
        ]);

        $this->assertDatabaseHas('progress', [
            'lesson_id' => $lesson->id,
            'status' => Progress::STATUS_COMPLETED,
        ]);
    }

    public function test_results_reveal_the_answer_key_after_grading(): void
    {
        $question = $this->addQuestion(['explanation' => 'Because it is right.']);
        $attempt = $this->startAttempt();

        $this->actingAs($this->student)->post(route('quiz.submit', $attempt), [
            'answers' => [$question->id => [1]],
        ]);

        $this->actingAs($this->student)
            ->get(route('quiz.result', $attempt))
            ->assertOk()
            ->assertSee('Because it is right.', escape: false);
    }
}
