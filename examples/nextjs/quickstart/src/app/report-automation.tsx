"use client"

import { ScheduleList, ScheduleTrigger } from "@incld/react-schedules"

export function ReportAutomation() {
 return (
  <section>
   <ScheduleTrigger
    action="generate_report"
    defaultPayload={{ accountId: "acct_42" }}
   >
    Schedule report
   </ScheduleTrigger>
   <ScheduleList filters={{ action: "generate_report" }} />
  </section>
 )
}
