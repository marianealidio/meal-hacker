import { addDays, parseISODate, toISODate } from "@/lib/dates";
import type { Week } from "@/lib/types";
import { DayColumn } from "./DayColumn";

export function WeekBoard({ start, week }: { start: string; week: Week }) {
  const first = parseISODate(start);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = toISODate(addDays(first, i));
    return { date, meals: week.days.find((d) => d.date === date)?.meals ?? [] };
  });
  const empty = days.every((d) => d.meals.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {empty && <p className="font-script text-[1.5rem] leading-none text-coral-deep">an empty week — add something tasty</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7 lg:grid-rows-[auto_repeat(3,minmax(5.5rem,auto))] lg:gap-x-3 lg:gap-y-0">
        {days.map((d) => (
          <DayColumn key={d.date} {...d} />
        ))}
      </div>
    </div>
  );
}
