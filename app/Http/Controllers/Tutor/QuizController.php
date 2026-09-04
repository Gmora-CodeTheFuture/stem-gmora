<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\Quiz;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

/**
 * Quiz settings and questions for a quiz lesson.
 */
class QuizController extends Controller
{
    public function update(Request $request, Quiz $quiz): RedirectResponse
    {
        $this->authorizeTutor($request, $quiz->course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'time_limit_seconds' => ['nullable', 'integer', 'min:30', 'max:86400'],
            'shuffle_questions' => ['sometimes', 'boolean'],
            'max_attempts' => ['required', 'integer', 'min:1', 'max:20'],
            'passing_score' => ['required', 'integer', 'min:0', 'max:100'],
            'is_published' => ['sometimes', 'boolean'],
        ]);

        $quiz->update($validated);

        return Redirect::back()->with('success', 'Quiz settings saved.');
    }

    public function storeQuestion(Request $request, Quiz $quiz): RedirectResponse
    {
        $this->authorizeTutor($request, $quiz->course);

        $validated = $this->validateQuestion($request);
        $maxOrder = $quiz->questions()->max('order_index') ?? -1;

        $quiz->questions()->create([
            ...$validated,
            'order_index' => $maxOrder + 1,
        ]);

        return Redirect::back()->with('success', 'Question added.');
    }

    public function updateQuestion(Request $request, Question $question): RedirectResponse
    {
        $question->loadMissing('quiz.course');
        $this->authorizeTutor($request, $question->quiz->course);

        $validated = $this->validateQuestion($request);
        $question->update($validated);

        return Redirect::back()->with('success', 'Question updated.');
    }

    public function destroyQuestion(Request $request, Question $question): RedirectResponse
    {
        $question->loadMissing('quiz.course');
        $this->authorizeTutor($request, $question->quiz->course);

        $question->delete();

        return Redirect::back()->with('success', 'Question deleted.');
    }

    /** @return array<string, mixed> */
    private function validateQuestion(Request $request): array
    {
        $types = implode(',', [
            Question::TYPE_MCQ,
            Question::TYPE_TRUE_FALSE,
            Question::TYPE_FILL_BLANK,
            Question::TYPE_CODE,
            Question::TYPE_MATCHING,
            Question::TYPE_ORDERING,
            Question::TYPE_ESSAY,
        ]);

        $validated = $request->validate([
            'type' => ['required', "in:{$types}"],
            'body' => ['required', 'string', 'max:10000'],
            'points' => ['required', 'integer', 'min:1', 'max:100'],
            'explanation' => ['nullable', 'string', 'max:5000'],
            'options' => ['nullable', 'array'],
            'options.*.text' => ['required_with:options', 'string', 'max:1000'],
            'options.*.is_correct' => ['sometimes', 'boolean'],
            'correct_answer' => ['nullable'],
        ]);

        $type = $validated['type'];

        if (in_array($type, [Question::TYPE_MCQ, Question::TYPE_TRUE_FALSE], true)) {
            $options = $validated['options'] ?? [];
            abort_if(count($options) < 2, 422, 'Choice questions need at least two options.');

            $correct = [];
            foreach ($options as $index => $option) {
                if (! empty($option['is_correct'])) {
                    $correct[] = $index;
                }
            }

            if ($correct === [] && is_array($validated['correct_answer'] ?? null)) {
                $correct = $validated['correct_answer'];
            }

            abort_if($correct === [], 422, 'Mark at least one correct option.');

            $validated['correct_answer'] = array_values($correct);
        }

        if ($type === Question::TYPE_FILL_BLANK) {
            $answer = $validated['correct_answer'] ?? null;
            if (is_string($answer)) {
                $validated['correct_answer'] = [trim($answer)];
            }
            $validated['options'] = [];
            abort_if(empty($validated['correct_answer']), 422, 'Fill-in-the-blank needs a correct answer.');
        }

        if (in_array($type, [Question::TYPE_ESSAY, Question::TYPE_CODE], true)) {
            $validated['options'] = [];
            $validated['correct_answer'] = null;
        }

        if ($type === Question::TYPE_ORDERING) {
            $options = $validated['options'] ?? [];
            abort_if(count($options) < 2, 422, 'Ordering questions need at least two items.');
            $validated['correct_answer'] = range(0, count($options) - 1);
        }

        return $validated;
    }

    /**
     * Ensure a quiz row exists for a quiz lesson (called after lesson create).
     */
    public static function ensureForLesson(Lesson $lesson): Quiz
    {
        return Quiz::firstOrCreate(
            ['lesson_id' => $lesson->id],
            [
                'course_id' => $lesson->module->course_id,
                'title' => $lesson->title,
                'max_attempts' => 3,
                'passing_score' => 60,
                'is_published' => false,
            ],
        );
    }

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
