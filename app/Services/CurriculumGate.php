<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\AssignmentQuestion;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Submission;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Places assignments in a module's shared order_index sequence with lessons,
 * and evaluates required-assignment gates along the curriculum.
 */
class CurriculumGate
{
    /**
     * Insert an assignment after a given lesson (or at the start of the module).
     * Bumps later lessons and assignments so the sequence stays contiguous.
     */
    public function placeAfterLesson(Assignment $assignment, Module $module, ?Lesson $afterLesson): void
    {
        $target = $afterLesson
            ? ((int) $afterLesson->order_index) + 1
            : 0;

        DB::transaction(function () use ($assignment, $module, $target) {
            Lesson::where('module_id', $module->id)
                ->where('order_index', '>=', $target)
                ->increment('order_index');

            Assignment::where('module_id', $module->id)
                ->where('id', '!=', $assignment->id)
                ->where('order_index', '>=', $target)
                ->increment('order_index');

            $assignment->forceFill([
                'module_id' => $module->id,
                'order_index' => $target,
                'lesson_id' => null,
            ])->save();
        });
    }

    /**
     * Clear curriculum placement (course-level assignment only).
     */
    public function clearPlacement(Assignment $assignment): void
    {
        $assignment->forceFill([
            'module_id' => null,
            'order_index' => 0,
        ])->save();
    }

    /**
     * Flatten published lessons + published in-module assignments into curriculum items.
     *
     * @param  Collection<int, Module>  $modules
     * @param  Collection<string, Submission>|null  $submissionsByAssignmentId
     * @return Collection<int, array<string, mixed>>
     */
    public function buildItems(Collection $modules, ?Collection $submissionsByAssignmentId = null): Collection
    {
        $items = collect();

        foreach ($modules as $module) {
            $lessons = $module->lessons ?? collect();
            $assignments = ($module->assignments ?? collect())
                ->filter(fn (Assignment $a) => $a->is_published);

            $merged = collect()
                ->concat($lessons->map(fn (Lesson $l) => [
                    'kind' => 'lesson',
                    'id' => $l->id,
                    'module_id' => $module->id,
                    'order_index' => (int) $l->order_index,
                    'lesson' => $l,
                ]))
                ->concat($assignments->map(fn (Assignment $a) => [
                    'kind' => 'assignment',
                    'id' => $a->id,
                    'module_id' => $module->id,
                    'order_index' => (int) $a->order_index,
                    'assignment' => $a,
                    'submitted' => $submissionsByAssignmentId?->has($a->id) ?? false,
                ]))
                ->sortBy([
                    ['order_index', 'asc'],
                    ['kind', 'asc'], // assignment before lesson on same index edge-case
                ])
                ->values();

            $items = $items->concat($merged);
        }

        return $items->values();
    }

    /**
     * First required published assignment before $itemIndex that the student has not submitted.
     *
     * @param  Collection<int, array<string, mixed>>  $items
     */
    public function blockingRequiredBefore(Collection $items, int $itemIndex): ?Assignment
    {
        for ($i = 0; $i < $itemIndex; $i++) {
            $item = $items[$i];
            if (($item['kind'] ?? null) !== 'assignment') {
                continue;
            }

            /** @var Assignment $assignment */
            $assignment = $item['assignment'];
            if (! $assignment->is_required) {
                continue;
            }

            if (! ($item['submitted'] ?? false)) {
                return $assignment;
            }
        }

        return null;
    }

    /**
     * Grade MCQ / short_answer; leave normal for instructor.
     *
     * @param  Collection<int, AssignmentQuestion>  $questions
     * @param  array<string, mixed>  $answers
     * @return array{earned: int, possible: int, needs_manual: bool}
     */
    public function scoreAnswers(Collection $questions, array $answers): array
    {
        $earned = 0;
        $possible = 0;
        $needsManual = false;

        foreach ($questions as $question) {
            $possible += $question->points;

            if (! $question->isAutoGradable()) {
                $needsManual = true;

                continue;
            }

            if ($this->isCorrect($question, $answers[$question->id] ?? null)) {
                $earned += $question->points;
            }
        }

        return [
            'earned' => $earned,
            'possible' => $possible,
            'needs_manual' => $needsManual,
        ];
    }

    public function isCorrect(AssignmentQuestion $question, mixed $answer): bool
    {
        if ($answer === null || $answer === '' || $answer === []) {
            return false;
        }

        $key = $question->correct_answer;

        return match ($question->type) {
            AssignmentQuestion::TYPE_MCQ => $this->sameSet($answer, $key),
            AssignmentQuestion::TYPE_SHORT_ANSWER => $this->matchesAnyText($answer, $key),
            default => false,
        };
    }

    private function sameSet(mixed $answer, mixed $key): bool
    {
        $given = collect((array) $answer)->map(fn ($v) => trim((string) $v))->unique()->sort()->values();
        $expected = collect((array) $key)->map(fn ($v) => trim((string) $v))->unique()->sort()->values();

        return $given->all() === $expected->all();
    }

    private function matchesAnyText(mixed $answer, mixed $key): bool
    {
        $given = mb_strtolower(trim((string) $answer));

        return collect((array) $key)
            ->map(fn ($v) => mb_strtolower(trim((string) $v)))
            ->contains($given);
    }
}
