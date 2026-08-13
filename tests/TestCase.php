<?php

namespace Tests;

use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Roles are reference data the application assumes exists (registration
     * assigns `student`), so every test database gets them.
     */
    protected bool $seed = true;

    protected string $seeder = RoleSeeder::class;
}
