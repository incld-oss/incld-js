import {describe, expect, test} from 'bun:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IncldBrowser} from '@incld/client';
import {IncldProvider} from '@incld/react';
import {NextRun, ScheduleComposer} from '../src/index.js';

describe('schedule components', () => {
  const client = new IncldBrowser({fetch: async () => Response.json({data: {}})});
  const schedule = {id:'sch_1',status:'active' as const,action:{identifier:'sync',displayName:'Sync'},payload:{},recurrence:{frequency:'daily' as const,interval:2,localTime:'14:30',timezone:'Europe/London'},timezone:'Europe/London',overlapPolicy:'skip' as const,misfirePolicy:'run_once' as const,nextRunAt:'2027-01-01T09:00:00Z',lastRunAt:null,revision:1,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'};

  test('uses the shared provider appearance contract', () => {
    const html = renderToStaticMarkup(<IncldProvider client={client} appearance={{accentColor: 'emerald', colorScheme: 'dark'}}><NextRun schedule={schedule} /></IncldProvider>);
    expect(html).toContain('data-accent="emerald"');
    expect(html).toContain('incld-next-run');
  });
  test('composer renders accessible labeled controls and a stable form id', () => {
    const html = renderToStaticMarkup(<IncldProvider client={client}><ScheduleComposer action="sync_contacts" /></IncldProvider>);
    expect(html).toContain('incld-schedule-composer-');
    expect(html).toContain('Repeats');
    expect(html).toContain('Timezone');
  });

  test('composer can edit from an existing schedule without waiting for a refetch', () => {
    const html = renderToStaticMarkup(<IncldProvider client={client}><ScheduleComposer action="sync" scheduleId={schedule.id} initialSchedule={schedule} mode="edit" /></IncldProvider>);
    expect(html).toContain('value="14:30"');
    expect(html).toContain('value="Europe/London"');
    expect(html).toContain('Save changes');
  });

  test('monthly schedules expose and preserve their day-of-month rule', () => {
    const html = renderToStaticMarkup(
      <IncldProvider client={client}>
        <ScheduleComposer
          action="sync"
          defaultValue={{
            timezone: 'UTC',
            recurrence: {
              frequency: 'monthly',
              interval: 1,
              monthlyMode: 'day_of_month',
              dayOfMonth: 29,
              localTime: '10:00',
              timezone: 'UTC',
            },
          }}
        />
      </IncldProvider>,
    );

    expect(html).toContain('Day of month');
    expect(html).toContain('value="29"');
    expect(html).toContain('Months without this date use the final calendar day.');
  });
});
