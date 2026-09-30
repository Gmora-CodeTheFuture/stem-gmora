<?php

namespace App\Services;

use App\Models\Lesson;
use App\Models\LessonMaterial;
use App\Models\Presentation;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

/**
 * Handles uploading, extracting, and serving HTML presentation bundles.
 *
 * Tutors upload a .zip containing an index.html and any assets (images, CSS, JS).
 * The service extracts the archive into a per-presentation storage directory and
 * records the entry file so the student-facing controller can serve it securely.
 */
class PresentationService
{
    public const DISK = 'local';

    /** Maximum uncompressed archive size: 50 MB. */
    public const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

    /**
     * Process an uploaded .zip file: extract it and create/update the Presentation record.
     */
    public function store(Lesson $lesson, UploadedFile $file): Presentation
    {
        $this->forgetExisting($lesson);

        $uuid = (string) Str::uuid();
        $storageDir = "presentations/{$uuid}";

        $this->extractZip($file, $storageDir);

        $entryFile = $this->findEntryFile($storageDir);

        return Presentation::create([
            'lesson_id' => $lesson->id,
            'original_filename' => $file->getClientOriginalName(),
            'entry_file' => $entryFile,
            'storage_path' => $storageDir,
            'file_size' => $file->getSize(),
        ]);
    }

    /** Store an HTML presentation bundle on a lesson material row. */
    public function storeForMaterial(LessonMaterial $material, UploadedFile $file): LessonMaterial
    {
        if ($material->storage_path) {
            Storage::disk(self::DISK)->deleteDirectory($material->storage_path);
        }

        $uuid = (string) Str::uuid();
        $storageDir = "presentations/{$uuid}";

        $this->extractZip($file, $storageDir);

        $entryFile = $this->findEntryFile($storageDir);

        $material->forceFill([
            'type' => LessonMaterial::TYPE_HTML,
            'original_filename' => $file->getClientOriginalName(),
            'entry_file' => $entryFile,
            'storage_path' => $storageDir,
            'file_size' => $file->getSize(),
        ])->save();

        return $material->fresh();
    }

    /**
     * Copy a staged directory (index.html + assets) onto a material row.
     * Used by seeders and one-off attach of course-content lesson HTML.
     */
    public function storeFromDirectoryForMaterial(
        LessonMaterial $material,
        string $sourceDir,
        string $entryFile = 'index.html',
        ?string $originalFilename = null,
    ): LessonMaterial {
        if (! is_dir($sourceDir)) {
            throw new \RuntimeException("Presentation source directory not found: {$sourceDir}");
        }

        $entryPath = rtrim($sourceDir, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$entryFile;
        if (! is_file($entryPath)) {
            throw new \RuntimeException("Presentation entry file not found: {$entryPath}");
        }

        if ($material->storage_path) {
            Storage::disk(self::DISK)->deleteDirectory($material->storage_path);
        }

        $uuid = (string) Str::uuid();
        $storageDir = "presentations/{$uuid}";
        $disk = Storage::disk(self::DISK);

        $this->moveDirectoryToStorage($sourceDir, $storageDir, $disk);

        $fileSize = 0;
        foreach ($disk->allFiles($storageDir) as $file) {
            $fileSize += (int) $disk->size($file);
        }

        $material->forceFill([
            'type' => LessonMaterial::TYPE_HTML,
            'original_filename' => $originalFilename ?? basename($sourceDir),
            'entry_file' => $entryFile,
            'storage_path' => $storageDir,
            'file_size' => $fileSize,
        ])->save();

        return $material->fresh();
    }

    /**
     * Copy a local directory tree into presentation storage (used by seeders).
     *
     * Expects $sourceDir to already contain the entry HTML and any relative assets.
     */
    public function storeFromDirectory(
        Lesson $lesson,
        string $sourceDir,
        string $entryFile = 'index.html',
        ?string $originalFilename = null,
    ): Presentation {
        if (! is_dir($sourceDir)) {
            throw new \RuntimeException("Presentation source directory not found: {$sourceDir}");
        }

        $entryPath = rtrim($sourceDir, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$entryFile;
        if (! is_file($entryPath)) {
            throw new \RuntimeException("Presentation entry file not found: {$entryPath}");
        }

        $this->forgetExisting($lesson);

        $uuid = (string) Str::uuid();
        $storageDir = "presentations/{$uuid}";
        $disk = Storage::disk(self::DISK);

        $this->moveDirectoryToStorage($sourceDir, $storageDir, $disk);

        $fileSize = 0;
        foreach ($disk->allFiles($storageDir) as $file) {
            $fileSize += (int) $disk->size($file);
        }

        return Presentation::create([
            'lesson_id' => $lesson->id,
            'original_filename' => $originalFilename ?? basename($sourceDir),
            'entry_file' => $entryFile,
            'storage_path' => $storageDir,
            'file_size' => $fileSize,
        ]);
    }

    /** Remove any previous presentation (files + row) for this lesson. */
    private function forgetExisting(Lesson $lesson): void
    {
        $existing = $lesson->presentation;
        if ($existing) {
            Storage::disk(self::DISK)->deleteDirectory($existing->storage_path);
            $existing->delete();
        }
    }

    /**
     * Extract the zip into the target storage directory.
     */
    private function extractZip(UploadedFile $file, string $storageDir): void
    {
        $zip = new ZipArchive;
        $opened = $zip->open($file->getRealPath());

        if ($opened !== true) {
            throw new \RuntimeException('Failed to open the zip file. Please upload a valid .zip archive.');
        }

        // Security: check total uncompressed size to prevent zip bombs.
        $totalSize = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $totalSize += $stat['size'];

            if ($totalSize > self::MAX_UNCOMPRESSED_BYTES) {
                $zip->close();
                throw new \RuntimeException('Archive exceeds the maximum allowed size of 50 MB when extracted.');
            }

            // Security: reject path traversal attempts (../../../etc/passwd).
            $name = $stat['name'];
            if (str_starts_with($name, '/') || str_contains($name, '..')) {
                $zip->close();
                throw new \RuntimeException('Archive contains unsafe file paths.');
            }
        }

        // Extract to a temporary directory, then move to storage.
        $tmpDir = storage_path('app/tmp_zip_'.Str::random(12));
        @mkdir($tmpDir, 0755, true);

        $zip->extractTo($tmpDir);
        $zip->close();

        // Move extracted files into Laravel storage.
        $disk = Storage::disk(self::DISK);
        $this->moveDirectoryToStorage($tmpDir, $storageDir, $disk);

        // Clean up temp directory.
        $this->deleteDirectory($tmpDir);
    }

    /**
     * Recursively move files from a local directory to the storage disk.
     */
    private function moveDirectoryToStorage(string $localDir, string $storagePath, $disk): void
    {
        $items = scandir($localDir);

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $localPath = $localDir.'/'.$item;
            $targetPath = $storagePath.'/'.$item;

            if (is_dir($localPath)) {
                $this->moveDirectoryToStorage($localPath, $targetPath, $disk);
            } else {
                $disk->put($targetPath, file_get_contents($localPath));
            }
        }
    }

    /**
     * Find the index.html entry file inside the extracted archive.
     * Supports archives where files are at the root, or inside a single subfolder.
     */
    private function findEntryFile(string $storageDir): string
    {
        $disk = Storage::disk(self::DISK);

        // Check for index.html at the root of the archive.
        if ($disk->exists("{$storageDir}/index.html")) {
            return 'index.html';
        }

        // Check one level deep (common pattern: archive contains a single folder).
        $directories = $disk->directories($storageDir);
        foreach ($directories as $subDir) {
            $relative = str_replace($storageDir.'/', '', $subDir);
            if ($disk->exists("{$subDir}/index.html")) {
                return "{$relative}/index.html";
            }
        }

        // Fallback: look for any .html file.
        $allFiles = $disk->allFiles($storageDir);
        foreach ($allFiles as $file) {
            if (str_ends_with($file, '.html') || str_ends_with($file, '.htm')) {
                return str_replace($storageDir.'/', '', $file);
            }
        }

        throw new \RuntimeException('No index.html or .html file found in the uploaded archive.');
    }

    /**
     * Recursively delete a local directory.
     */
    private function deleteDirectory(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.'/'.$item;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }
}
