'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import {
  communityAPI,
  type CommunityEvent,
  type CommunityRsvpStatus,
} from '@/lib/api/community';

interface CommunityCalendarTabProps {
  communityId: string;
  isModerator: boolean;
}

const EVENT_TYPE_OPTIONS = [
  { value: 'yoga', label: 'Yoga' },
  { value: 'walkathon', label: 'Walkathon' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'health_camp', label: 'Health camp' },
  { value: 'gathering', label: 'Gathering' },
  { value: 'other', label: 'Other' },
];

export function CommunityCalendarTab({ communityId, isModerator }: CommunityCalendarTabProps) {
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const [view, setView] = useState<'agenda' | 'week' | 'month'>('agenda');
  const [filter, setFilter] = useState<'upcoming' | 'completed' | 'mine' | 'all'>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('gathering');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [error, setError] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ['community-events', communityId, filter],
    queryFn: async () => {
      const res = await communityAPI.events(communityId, { filter });
      return res.data.data.events ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      communityAPI.createEvent(communityId, {
        title: title.trim(),
        description: description.trim(),
        eventType,
        startsAt: new Date(startsAt).toISOString(),
        location: location.trim(),
        meetingLink: meetingLink.trim(),
        status: 'published',
      }),
    onSuccess: () => {
      setShowForm(false);
      setTitle('');
      setDescription('');
      setStartsAt('');
      setLocation('');
      setMeetingLink('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['community-events', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-upcoming-events', communityId] });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not create event'
      );
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: CommunityRsvpStatus }) =>
      communityAPI.rsvpEvent(communityId, eventId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community-events', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-upcoming-events', communityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => communityAPI.deleteEvent(communityId, eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community-events', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-upcoming-events', communityId] });
    },
  });

  const events = eventsQuery.data ?? [];

  const grouped = useMemo(() => {
    if (view === 'agenda') return { Agenda: events };
    if (view === 'week') {
      const start = DateTime.now().setZone('Asia/Kolkata').startOf('week');
      const end = start.endOf('week');
      return {
        'This week': events.filter((e) => {
          const d = DateTime.fromISO(e.startsAt);
          return d >= start && d <= end;
        }),
      };
    }
    const byMonth: Record<string, CommunityEvent[]> = {};
    events.forEach((e) => {
      const key = DateTime.fromISO(e.startsAt).toFormat('LLLL yyyy');
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(e);
    });
    return byMonth;
  }, [events, view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipTabs
          className="flex-1"
          tabs={[
            { id: 'agenda', label: 'Agenda' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
          ]}
          active={view}
          onChange={(id) => setView(id as typeof view)}
        />
        {isModerator ? (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Event
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['upcoming', 'completed', 'mine', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                : 'rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground'
            }
          >
            {f === 'mine' ? 'My events' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {showForm ? (
        <div className="section-card space-y-2 p-4">
          <p className="text-sm font-semibold">New community event</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm"
          />
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
          >
            {EVENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
          />
          <input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Meeting link (optional)"
            className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button
            className="w-full"
            disabled={!title.trim() || !startsAt || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Publish event
          </Button>
        </div>
      ) : null}

      {eventsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <div className="section-card p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No events in this view</p>
        </div>
      ) : (
        Object.entries(grouped).map(([section, rows]) => (
          <div key={section} className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section}
            </p>
            <ul className="section-card divide-y divide-border">
              {rows.map((event) => (
                <li key={event.id} className="space-y-2 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {event.title}
                        {event.isChallengeVirtual ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-primary">
                            Challenge
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {DateTime.fromISO(event.startsAt).toFormat('ccc d LLL · h:mm a')}
                        {event.location ? ` · ${event.location}` : ''}
                      </p>
                      {event.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                      {!event.isChallengeVirtual ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {event.rsvpCounts.going} going · {event.rsvpCounts.interested} interested
                        </p>
                      ) : null}
                    </div>
                    {isModerator && !event.isChallengeVirtual ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          requestConfirm({
                            title: 'Delete this event?',
                            description:
                              'The event will be removed from the community calendar. This action cannot be undone.',
                            confirmLabel: 'Delete',
                            onConfirm: () => deleteMutation.mutateAsync(event.id),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                  {!event.isChallengeVirtual && event.status === 'published' ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(['going', 'interested', 'not_going'] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={event.myRsvp === status ? 'default' : 'outline'}
                          className="h-8 text-[11px]"
                          disabled={rsvpMutation.isPending}
                          onClick={() => rsvpMutation.mutate({ eventId: event.id, status })}
                        >
                          {status === 'going'
                            ? 'Going'
                            : status === 'interested'
                              ? 'Interested'
                              : 'Not going'}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      {ConfirmDialogElement}
    </div>
  );
}
