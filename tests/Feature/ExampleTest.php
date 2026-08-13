<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    // Sessions live in the database in the test environment.
    use RefreshDatabase;

    public function test_the_marketing_home_page_is_reachable_by_guests(): void
    {
        $this->get('/')->assertOk();
    }
}
