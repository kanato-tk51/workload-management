import { requireNamedSession } from "@/lib/session";
import { getYearMonthNow } from "@/lib/date";

import TimesheetClient from "@/app/timesheet/TimesheetClient";

export const dynamic = "force-dynamic";

export default async function TimesheetPage() {
  await requireNamedSession();
  const month = getYearMonthNow();

  return <TimesheetClient initialMonth={month} />;
}
