<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presentations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->string('original_filename');   // what the tutor uploaded
            $table->string('entry_file');           // relative path to index.html inside the extracted folder
            $table->string('storage_path');         // base directory in storage, e.g. presentations/{uuid}
            $table->bigInteger('file_size')->default(0);
            $table->timestamps();

            $table->unique('lesson_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presentations');
    }
};
