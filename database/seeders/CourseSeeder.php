<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\LiveSession;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * The Phase 1 launch course (Plan §1.3): AI Fundamentals.
 *
 * `content_ref` values here are placeholder YouTube IDs — replace them with
 * real unlisted uploads from the Gmora channel. They are seeded server-side
 * only and never reach a client except through a video ticket.
 */
class CourseSeeder extends Seeder
{
    public function run(): void
    {
        $instructor = User::whereHas('role', fn ($q) => $q->where('name', Role::INSTRUCTOR))->first();

        if (! $instructor) {
            $this->command?->warn('No instructor found — run DatabaseSeeder first.');

            return;
        }

        $course = Course::updateOrCreate(
            ['slug' => 'ai-fundamentals'],
            [
                'instructor_id' => $instructor->id,
                'title' => 'AI Fundamentals',
                'subtitle' => 'Build a working understanding of modern AI — from neurons to neural networks.',
                'description' => "A project-driven introduction to artificial intelligence for secondary and early-university students.\n\nYou'll go from the intuition behind machine learning to training and evaluating your own models, finishing with a portfolio project you can show off. No prior AI experience needed — comfort with basic Python helps.",
                'category' => 'Artificial Intelligence',
                'difficulty' => 'beginner',
                'language' => 'en',
                'price' => 0,
                'currency' => 'USD',
                'status' => Course::STATUS_PUBLISHED,
                'thumbnail_url' => null,
            ]
        );

        $course->modules()->delete();

        $blueprint = [
            [
                'title' => 'Getting Started with AI',
                'description' => 'What AI actually is, where it works, and where it fails.',
                'lessons' => [
                    ['title' => 'Welcome to AI Fundamentals', 'type' => Lesson::TYPE_YOUTUBE, 'ref' => 'aircAruvnKk', 'seconds' => 620, 'preview' => true],
                    ['title' => 'A Short History of Machine Intelligence', 'type' => Lesson::TYPE_YOUTUBE, 'ref' => 'IHZwWFHWa-w', 'seconds' => 780],
                    ['title' => 'Setting Up Your Python Environment', 'type' => Lesson::TYPE_PDF, 'ref' => 'guides/python-setup.pdf', 'seconds' => 0],
                ],
            ],
            [
                'title' => 'How Machines Learn',
                'description' => 'Supervised learning, loss, and gradient descent — with the maths kept honest but approachable.',
                'lessons' => [
                    ['title' => 'Supervised vs. Unsupervised Learning', 'type' => Lesson::TYPE_YOUTUBE, 'ref' => 'Ilg3gGewQ5U', 'seconds' => 900],
                    ['title' => 'Loss Functions and Gradient Descent', 'type' => Lesson::TYPE_YOUTUBE, 'ref' => 'IHZwWFHWa-w', 'seconds' => 1080],
                    ['title' => 'Live Lab: Train Your First Model', 'type' => Lesson::TYPE_LIVE, 'ref' => null, 'seconds' => 3600],
                ],
            ],
            [
                'title' => 'Neural Networks in Practice',
                'description' => 'Build, train, and evaluate a small network end to end.',
                'lessons' => [
                    ['title' => 'Anatomy of a Neural Network', 'type' => Lesson::TYPE_YOUTUBE, 'ref' => 'aircAruvnKk', 'seconds' => 1140],
                    ['title' => 'Overfitting, Validation, and Honest Evaluation', 'type' => Lesson::TYPE_YOUTUBE, 'ref' => 'Ilg3gGewQ5U', 'seconds' => 840],
                    ['title' => 'Module Quiz: Neural Networks', 'type' => Lesson::TYPE_QUIZ, 'ref' => null, 'seconds' => 0],
                ],
            ],
        ];

        $totalSeconds = 0;
        $totalLessons = 0;

        foreach ($blueprint as $moduleIndex => $moduleData) {
            $module = $course->modules()->create([
                'title' => $moduleData['title'],
                'description' => $moduleData['description'],
                'order_index' => $moduleIndex,
                'is_published' => true,
            ]);

            foreach ($moduleData['lessons'] as $lessonIndex => $lessonData) {
                $lesson = $module->lessons()->create([
                    'title' => $lessonData['title'],
                    'type' => $lessonData['type'],
                    'order_index' => $lessonIndex,
                    'content_ref' => $lessonData['ref'],
                    'duration_seconds' => $lessonData['seconds'],
                    'is_free_preview' => $lessonData['preview'] ?? false,
                    'is_published' => true,
                ]);

                $totalSeconds += $lessonData['seconds'];
                $totalLessons++;

                if ($lessonData['type'] === Lesson::TYPE_LIVE) {
                    $this->seedLiveSession($lesson);
                }

                if ($lessonData['type'] === Lesson::TYPE_QUIZ) {
                    $this->seedQuiz($course, $lesson);
                }
            }
        }

        $course->update([
            'duration_minutes' => (int) round($totalSeconds / 60),
            'total_lessons' => $totalLessons,
        ]);

        $this->command?->info("Seeded course: {$course->title} ({$totalLessons} lessons).");
    }

    private function seedLiveSession(Lesson $lesson): void
    {
        LiveSession::updateOrCreate(
            ['lesson_id' => $lesson->id],
            [
                'title' => $lesson->title,
                'scheduled_start' => now()->addDays(3)->setTime(18, 0),
                'duration_minutes' => 60,
                'zoom_join_url' => 'https://zoom.us/j/00000000000',
                'zoom_meeting_id' => '000 0000 0000',
                'zoom_passcode' => 'gmora',
            ]
        );
    }

    private function seedQuiz(Course $course, Lesson $lesson): void
    {
        $quiz = Quiz::updateOrCreate(
            ['lesson_id' => $lesson->id],
            [
                'course_id' => $course->id,
                'title' => 'Neural Networks Check-in',
                'description' => 'Five questions on what you just covered.',
                'time_limit_seconds' => 600,
                'shuffle_questions' => true,
                'max_attempts' => 3,
                'passing_score' => 60,
                'is_published' => true,
            ]
        );

        $quiz->questions()->delete();

        $questions = [
            [
                'type' => 'mcq',
                'body' => 'What does a loss function measure?',
                'options' => [
                    ['text' => 'How wrong the model’s predictions are', 'is_correct' => true],
                    ['text' => 'How fast the model trains'],
                    ['text' => 'How much memory the model uses'],
                    ['text' => 'How many layers the network has'],
                ],
                'correct_answer' => [0],
                'explanation' => 'Loss quantifies prediction error; training minimises it.',
            ],
            [
                'type' => 'true_false',
                'body' => 'A model that scores perfectly on training data will always generalise well.',
                'options' => [['text' => 'True'], ['text' => 'False', 'is_correct' => true]],
                'correct_answer' => [1],
                'explanation' => 'That is the classic signature of overfitting.',
            ],
            [
                'type' => 'mcq',
                'body' => 'Which split should you use to tune hyperparameters?',
                'options' => [
                    ['text' => 'The training set'],
                    ['text' => 'The validation set', 'is_correct' => true],
                    ['text' => 'The test set'],
                    ['text' => 'Any of them'],
                ],
                'correct_answer' => [1],
                'explanation' => 'Touching the test set during tuning leaks information and inflates your reported score.',
            ],
        ];

        foreach ($questions as $index => $question) {
            Question::create([
                'quiz_id' => $quiz->id,
                'type' => $question['type'],
                'body' => $question['body'],
                'options' => $question['options'],
                'correct_answer' => $question['correct_answer'],
                'points' => 1,
                'order_index' => $index,
                'explanation' => $question['explanation'],
            ]);
        }
    }
}
