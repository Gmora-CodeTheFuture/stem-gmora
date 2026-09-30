<?php

namespace App\Console\Commands;

use App\Models\Lesson;
use App\Models\LessonMaterial;
use Illuminate\Console\Command;

/**
 * Copy legacy single-type lesson payloads into lesson_materials rows
 * so tutors can edit them as multi-material topics.
 */
class BackfillLessonMaterials extends Command
{
    protected $signature = 'lessons:backfill-materials {--dry-run : Show counts without writing}';

    protected $description = 'Create lesson_materials rows from legacy lesson content';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $created = 0;
        $skipped = 0;

        Lesson::query()
            ->with(['materials', 'presentation', 'liveSession'])
            ->where('type', '!=', Lesson::TYPE_QUIZ)
            ->orderBy('id')
            ->chunkById(100, function ($lessons) use ($dry, &$created, &$skipped) {
                foreach ($lessons as $lesson) {
                    if ($lesson->materials->isNotEmpty()) {
                        $skipped++;

                        continue;
                    }

                    $synthetic = $lesson->synthesizeLegacyMaterials()->first();
                    if (! $synthetic || ! $synthetic->isReady() && ! filled($synthetic->getRawOriginal('content_ref')) && $synthetic->type !== LessonMaterial::TYPE_LIVE) {
                        // Still create a stub for types that have a title-only live row, etc.
                        if (! $synthetic) {
                            $skipped++;

                            continue;
                        }
                    }

                    if ($dry) {
                        $created++;

                        continue;
                    }

                    LessonMaterial::create([
                        'lesson_id' => $lesson->id,
                        'type' => $synthetic->type,
                        'title' => $synthetic->title ?: $synthetic->defaultTitle(),
                        'order_index' => 0,
                        'content_ref' => $synthetic->getRawOriginal('content_ref'),
                        'original_filename' => $synthetic->original_filename,
                        'entry_file' => $synthetic->entry_file,
                        'storage_path' => $synthetic->storage_path,
                        'file_size' => $synthetic->file_size,
                        'scheduled_start' => $synthetic->scheduled_start,
                        'duration_minutes' => $synthetic->duration_minutes,
                        'zoom_join_url' => $synthetic->zoom_join_url,
                        'zoom_meeting_id' => $synthetic->zoom_meeting_id,
                        'zoom_passcode' => $synthetic->zoom_passcode,
                        'recording_url' => $synthetic->recording_url,
                    ]);
                    $created++;
                }
            });

        $this->info(($dry ? '[dry-run] Would create ' : 'Created ').$created.' material(s); skipped '.$skipped.'.');

        return self::SUCCESS;
    }
}
