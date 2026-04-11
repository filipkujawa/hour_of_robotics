update public.lesson_progress
set step = 'learn'
where step = 'pretest';

alter table public.lesson_progress
drop constraint if exists lesson_progress_step_check;

alter table public.lesson_progress
add constraint lesson_progress_step_check
check (step in ('learn', 'exercise'));

alter table public.lesson_progress
drop column if exists pretest_answer;
