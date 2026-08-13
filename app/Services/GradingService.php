<?php

namespace App\Services;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Illuminate\Support\Collection;

/**
 * Auto-grading for the quiz system (Plan §4.4).
 *
 * Objective question types are graded here; essay and code questions are
 * routed to an instructor, and the attempt stays `submitted` (not `graded`)
 * until they mark it. AI-assisted grading stays assistive, never final
 * (Plan §10.2) — it is not wired into this path.
 */
class GradingService
{
    /**
     * Grade a submitted attempt and persist the result.
     *
     * @param  array<string, mixed>  $answers  keyed by question ID
     */
    public function grade(QuizAttempt $attempt, array $answers): QuizAttempt
    {
        /** @var Collection<int, Question> $questions */
        $questions = $attempt->quiz->questions;

        $earned = 0;
        $possible = 0;
        $needsManualReview = false;

        foreach ($questions as $question) {
            $possible += $question->points;

            if (! $question->isAutoGradable()) {
                $needsManualReview = true;

                continue;
            }

            if ($this->isCorrect($question, $answers[$question->id] ?? null)) {
                $earned += $question->points;
            }
        }

        $attempt->fill([
            'answers' => $answers,
            'points_earned' => $earned,
            'points_possible' => $possible,
            'score' => $possible > 0 ? round($earned / $possible * 100, 2) : 0,
            'status' => $needsManualReview ? QuizAttempt::STATUS_SUBMITTED : QuizAttempt::STATUS_GRADED,
            'submitted_at' => now(),
        ])->save();

        return $attempt;
    }

    /** Did the student pass, against the quiz's threshold? */
    public function hasPassed(Quiz $quiz, QuizAttempt $attempt): bool
    {
        return (float) $attempt->score >= (float) $quiz->passing_score;
    }

    /**
     * Per-question correctness. Answers arrive in the shape the player sends:
     * option indices for choice types, a string for fill-in-the-blank, an
     * ordered index list for ordering, and a {left: right} map for matching.
     */
    public function isCorrect(Question $question, mixed $answer): bool
    {
        if ($answer === null || $answer === '' || $answer === []) {
            return false;
        }

        $key = $question->correct_answer;

        return match ($question->type) {
            Question::TYPE_MCQ, Question::TYPE_TRUE_FALSE => $this->sameSet($answer, $key),
            Question::TYPE_ORDERING => $this->sameSequence($answer, $key),
            Question::TYPE_MATCHING => $this->sameMap($answer, $key),
            Question::TYPE_FILL_BLANK => $this->matchesAnyText($answer, $key),
            default => false,
        };
    }

    /** Order-insensitive comparison, so multi-select MCQ works either way. */
    private function sameSet(mixed $answer, mixed $key): bool
    {
        $given = collect((array) $answer)->map($this->normaliseScalar(...))->unique()->sort()->values();
        $expected = collect((array) $key)->map($this->normaliseScalar(...))->unique()->sort()->values();

        return $given->all() === $expected->all();
    }

    private function sameSequence(mixed $answer, mixed $key): bool
    {
        $given = collect((array) $answer)->map($this->normaliseScalar(...))->values()->all();
        $expected = collect((array) $key)->map($this->normaliseScalar(...))->values()->all();

        return $given === $expected;
    }

    private function sameMap(mixed $answer, mixed $key): bool
    {
        if (! is_array($answer) || ! is_array($key)) {
            return false;
        }

        $given = collect($answer)->map($this->normaliseScalar(...))->sortKeys()->all();
        $expected = collect($key)->map($this->normaliseScalar(...))->sortKeys()->all();

        return $given === $expected;
    }

    /** Any listed spelling counts; comparison ignores case and edge whitespace. */
    private function matchesAnyText(mixed $answer, mixed $key): bool
    {
        $given = $this->normaliseText($answer);

        return collect((array) $key)
            ->map($this->normaliseText(...))
            ->contains($given);
    }

    private function normaliseScalar(mixed $value): string
    {
        return is_bool($value) ? ($value ? '1' : '0') : trim((string) $value);
    }

    private function normaliseText(mixed $value): string
    {
        return mb_strtolower(trim((string) $value));
    }
}
