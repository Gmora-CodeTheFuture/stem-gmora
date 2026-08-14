<?php

namespace App\Services;

use App\Models\Lesson;
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
        // Clean up any previous upload for this lesson.
        $existing = $lesson->presentation;
        if ($existing) {
            Storage::disk(self::DISK)->deleteDirectory($existing->storage_path);
            $existing->delete();
        }

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
