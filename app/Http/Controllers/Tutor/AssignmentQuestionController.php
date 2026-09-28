<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentQuestion;
use App\Models\Course;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class AssignmentQuestionController extends Controller
{
    public function store(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);

        $validated = $this->validateQuestion($request);
        $maxOrder = $assignment->questions()->max('order_index') ?? -1;

        $assignment->questions()->create([
            ...$validated,
            'order_index' => $maxOrder + 1,
        ]);

        return Redirect::back()->with('success', 'Question added.');
    }

    public function destroy(Request $request, AssignmentQuestion $assignmentQuestion): RedirectResponse
    {
        $assignmentQuestion->loadMissing('assignment.course');
        $this->authorizeTutor($request, $assignmentQuestion->assignment->course);

        $assignmentQuestion->delete();

        return Redirect::back()->with('success', 'Question deleted.');
    }

    /** @return array<string, mixed> */
    private function validateQuestion(Request $request): array
    {
        $types = implode(',', [
            AssignmentQuestion::TYPE_MCQ,
            AssignmentQuestion::TYPE_SHORT_ANSWER,
            AssignmentQuestion::TYPE_NORMAL,
        ]);

        $validated = $request->validate([
            'type' => ['required', "in:{$types}"],
            'body' => ['required', 'string', 'max:10000'],
            'points' => ['required', 'integer', 'min:1', 'max:100'],
            'options' => ['nullable', 'array'],
            'options.*.text' => ['required_with:options', 'string', 'max:1000'],
            'options.*.is_correct' => ['sometimes', 'boolean'],
            'correct_answer' => ['nullable'],
        ]);

        $type = $validated['type'];

        if ($type === AssignmentQuestion::TYPE_MCQ) {
            $options = $validated['options'] ?? [];
            abort_if(count($options) < 2, 422, 'Multiple choice needs at least two options.');

            $correct = [];
            foreach ($options as $index => $option) {
                if (! empty($option['is_correct'])) {
                    $correct[] = $index;
                }
            }

            abort_if($correct === [], 422, 'Mark at least one correct option.');

            $validated['correct_answer'] = array_values($correct);
            $validated['options'] = array_map(
                fn ($o) => ['text' => $o['text'], 'is_correct' => ! empty($o['is_correct'])],
                $options,
            );
        }

        if ($type === AssignmentQuestion::TYPE_SHORT_ANSWER) {
            $raw = $validated['correct_answer'] ?? '';
            $answers = is_array($raw)
                ? $raw
                : preg_split('/\s*\|\s*/', (string) $raw, -1, PREG_SPLIT_NO_EMPTY);

            abort_if($answers === [] || $answers === false, 422, 'Provide at least one acceptable answer.');

            $validated['correct_answer'] = array_values(array_map('strval', $answers));
            $validated['options'] = [];
        }

        if ($type === AssignmentQuestion::TYPE_NORMAL) {
            $validated['options'] = [];
            $validated['correct_answer'] = null;
        }

        return $validated;
    }

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
