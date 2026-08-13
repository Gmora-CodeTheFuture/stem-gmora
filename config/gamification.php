<?php

/*
|--------------------------------------------------------------------------
| Gamification
|--------------------------------------------------------------------------
|
| XP awarded for each real learning action. These are the only places XP is
| ever granted — there is no manual top-up path, so a student's level always
| reflects work they actually did.
|
*/

return [
    'xp' => [
        'lesson_completed' => 25,
        'quiz_passed' => 50,
        'assignment_graded' => 40,
        'course_completed' => 200,
    ],

    /*
     | Level curve: level = floor(sqrt(xp / step)) + 1.
     | With step 100: L2 at 100 XP, L3 at 400, L4 at 900, L5 at 1600.
     */
    'level_step' => 100,
];
