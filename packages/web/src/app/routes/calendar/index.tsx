import {
  FlowRun,
  FlowRunStatus,
  PopulatedFlow,
  TriggerSourceScheduleType,
} from '@activepieces/shared';
import { useQuery } from '@tanstack/react-query';
import cronstrue from 'cronstrue';
import dayjs, { Dayjs } from 'dayjs';
import { t } from 'i18next';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Layers,
  List,
  PlayCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  Search,
} from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/custom/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { flowRunsApi } from '@/features/flow-runs/api/flow-runs-api';
import { flowsApi } from '@/features/flows/api/flows-api';
import { authenticationSession } from '@/lib/authentication-session';
import { cn, DASHBOARD_CONTENT_PADDING_X } from '@/lib/utils';

export type CalendarViewType = 'week' | 'day' | 'agenda';

export interface CalendarEvent {
  id: string;
  title: string;
  flowId: string;
  runId?: string;
  startTime: Dayjs;
  endTime: Dayjs;
  isScheduled: boolean;
  status?: FlowRunStatus;
  durationMs?: number;
  cronExpression?: string;
  description?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT_PX = 60; // 60px per hour = 1px per minute

// Helper to calculate occurrences of a standard 5-part cron within a window
function getCronOccurrencesInWindow(
  cronExpr: string,
  startWindow: Dayjs,
  endWindow: Dayjs,
  limit = 40,
): Dayjs[] {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return [];

  const [minPart, hourPart, domPart, , dowPart] = parts;
  const matches = (value: number, part: string): boolean => {
    if (part === '*') return true;
    if (part.includes(',')) {
      return part.split(',').some((p) => matches(value, p));
    }
    if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2), 10);
      return !isNaN(step) && step > 0 && value % step === 0;
    }
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((v) => parseInt(v, 10));
      return value >= start && value <= end;
    }
    return parseInt(part, 10) === value;
  };

  const results: Dayjs[] = [];
  let curr = startWindow.startOf('hour');

  while (curr.isBefore(endWindow) && results.length < limit) {
    const hour = curr.hour();
    const dom = curr.date();
    const dow = curr.day();

    if (
      matches(hour, hourPart) &&
      matches(dom, domPart) &&
      matches(dow, dowPart)
    ) {
      for (let m = 0; m < 60; m += 5) {
        if (matches(m, minPart)) {
          const occ = curr.minute(m).second(0);
          if (occ.isAfter(startWindow) && occ.isBefore(endWindow)) {
            results.push(occ);
            if (results.length >= limit) break;
          }
        }
      }
    }
    curr = curr.add(1, 'hour');
  }

  return results;
}

export default function AutomationCalendarPage() {
  const navigate = useNavigate();
  const projectId = authenticationSession.getProjectId()!;
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  
  // Responsive default view: on mobile screen (< 768px), default to 'day' or 'agenda'
  const [view, setView] = useState<CalendarViewType>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'day';
    }
    return 'week';
  });

  const [selectedFlowId, setSelectedFlowId] = useState<string>('all');
  const [showScheduled, setShowScheduled] = useState(true);
  const [showRuns, setShowRuns] = useState(true);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Fetch runs
  const { data: runsData, isLoading: runsLoading, refetch: refetchRuns } = useQuery({
    queryKey: ['calendar-flow-runs', projectId],
    queryFn: () => flowRunsApi.list({ projectId, limit: 100 }),
    refetchInterval: 30000,
  });

  // Fetch flows to get schedule triggers
  const { data: flowsData, isLoading: flowsLoading } = useQuery({
    queryKey: ['calendar-flows', projectId],
    queryFn: () => flowsApi.list({ projectId, limit: 100, cursor: undefined }),
  });

  const flowsList = useMemo(() => flowsData?.data ?? [], [flowsData]);

  // Window boundaries
  const windowStart = useMemo(() => {
    if (view === 'day') return currentDate.startOf('day');
    if (view === 'week') return currentDate.startOf('week');
    return currentDate.startOf('month');
  }, [currentDate, view]);

  const windowEnd = useMemo(() => {
    if (view === 'day') return currentDate.endOf('day');
    if (view === 'week') return currentDate.endOf('week');
    return currentDate.endOf('month');
  }, [currentDate, view]);

  // Week days array
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => windowStart.add(i, 'day'));
  }, [windowStart]);

  // Process events
  const events = useMemo(() => {
    const list: CalendarEvent[] = [];

    // 1. Past & current flow runs
    if (showRuns && runsData?.data) {
      for (const run of runsData.data) {
        if (selectedFlowId !== 'all' && run.flowId !== selectedFlowId) continue;
        const durationMs =
          run.startTime && run.finishTime
            ? Math.max(0, new Date(run.finishTime).getTime() - new Date(run.startTime).getTime())
            : undefined;
        const start = dayjs(run.startTime || run.created);
        const end = run.finishTime
          ? dayjs(run.finishTime)
          : start.add(Math.max(15, (durationMs ?? 60000) / 1000 / 60), 'minute');

        list.push({
          id: `run-${run.id}`,
          runId: run.id,
          flowId: run.flowId,
          title: run.flowVersion?.displayName || (run as any).flowDisplayName || t('Automation Run'),
          startTime: start,
          endTime: end,
          isScheduled: false,
          status: run.status,
          durationMs,
        });
      }
    }

    // 2. Scheduled future occurrences
    if (showScheduled && flowsList.length > 0) {
      const now = dayjs();
      const schedStart = windowStart.isBefore(now) ? now : windowStart;

      for (const flow of flowsList) {
        if (selectedFlowId !== 'all' && flow.id !== selectedFlowId) continue;
        const schedule = flow.triggerSource?.schedule || (flow as any).scheduleOptions;

        if (schedule && schedule.type === TriggerSourceScheduleType.CRON_EXPRESSION) {
          const occs = getCronOccurrencesInWindow(
            schedule.cronExpression,
            schedStart,
            windowEnd,
          );
          for (const occ of occs) {
            list.push({
              id: `sched-${flow.id}-${occ.valueOf()}`,
              flowId: flow.id,
              title: flow.version.displayName,
              startTime: occ,
              endTime: occ.add(15, 'minute'),
              isScheduled: true,
              cronExpression: schedule.cronExpression,
            });
          }
        }
      }
    }

    return list;
  }, [showRuns, showScheduled, runsData, flowsList, selectedFlowId, windowStart, windowEnd]);

  // Auto-scroll to 08:00 AM on initial load
  useEffect(() => {
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollTop = 8 * HOUR_HEIGHT_PX;
    }
  }, [view]);

  // Navigation handlers
  const handlePrev = () => {
    if (view === 'day') setCurrentDate((d) => d.subtract(1, 'day'));
    else if (view === 'week') setCurrentDate((d) => d.subtract(1, 'week'));
    else setCurrentDate((d) => d.subtract(1, 'month'));
  };

  const handleNext = () => {
    if (view === 'day') setCurrentDate((d) => d.add(1, 'day'));
    else if (view === 'week') setCurrentDate((d) => d.add(1, 'week'));
    else setCurrentDate((d) => d.add(1, 'month'));
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  const formattedPeriodLabel = useMemo(() => {
    if (view === 'day') {
      return currentDate.format('ddd, DD MMM YYYY');
    }
    if (view === 'week') {
      const start = windowStart.format('DD MMM');
      const end = windowEnd.format('DD MMM YYYY');
      return `${start} - ${end}`;
    }
    return currentDate.format('MMMM YYYY');
  }, [currentDate, view, windowStart, windowEnd]);

  const renderStatusBadge = (event: CalendarEvent) => {
    if (event.isScheduled) {
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/40 text-blue-500 bg-blue-500/10 text-[11px]">
          <Clock className="w-3 h-3" />
          {t('Scheduled')}
        </Badge>
      );
    }
    switch (event.status) {
      case FlowRunStatus.SUCCEEDED:
        return (
          <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[11px]">
            <CheckCircle2 className="w-3 h-3" />
            {t('Success')}
          </Badge>
        );
      case FlowRunStatus.FAILED:
        return (
          <Badge variant="outline" className="gap-1 border-rose-500/40 text-rose-500 bg-rose-500/10 text-[11px]">
            <XCircle className="w-3 h-3" />
            {t('Failed')}
          </Badge>
        );
      case FlowRunStatus.RUNNING:
        return (
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-500 bg-amber-500/10 text-[11px]">
            <RotateCw className="w-3 h-3 animate-spin" />
            {t('Running')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground text-[11px]">
            <AlertCircle className="w-3 h-3" />
            {event.status || t('Unknown')}
          </Badge>
        );
    }
  };

  const displayedDays = view === 'day' ? [currentDate] : weekDays;

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden min-w-0">
      {/* Top Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2 min-w-0">
            <CalendarIcon className="h-5 w-5 text-primary shrink-0" />
            <span className="text-base font-semibold truncate">{t('Automation Calendar')}</span>
            <Badge variant="secondary" className="text-xs font-normal shrink-0">
              {events.length} {t('events')}
            </Badge>
          </div>
        }
        description={t('Visual schedule of upcoming automations and execution timeline')}
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchRuns()}
              disabled={runsLoading}
              className="h-8 gap-1.5"
            >
              <RotateCw className={cn('h-3.5 w-3.5', runsLoading && 'animate-spin')} />
              <span className="hidden sm:inline">{t('Refresh')}</span>
            </Button>
          </div>
        }
      />

      {/* Calendar Controls & Filters Toolbar (Fully Responsive) */}
      <div
        className={cn(
          'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 py-2.5 border-b bg-card/40 shrink-0 min-w-0',
          'px-4 sm:px-6',
        )}
      >
        {/* Navigation & Period */}
        <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="sm" onClick={handleToday} className="h-8 px-2.5 text-xs">
              {t('Today')}
            </Button>
            <div className="flex items-center border rounded-md">
              <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-7">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-7">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <span className="text-xs sm:text-sm font-semibold truncate ml-1">{formattedPeriodLabel}</span>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 min-w-0">
          {/* Flow Filter */}
          <div className="w-[140px] sm:w-[170px]">
            <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t('Filter flow')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Automations')}</SelectItem>
                {flowsList.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs truncate">
                    {f.version.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle Type Filters */}
          <div className="flex items-center gap-0.5 border rounded-md p-0.5 bg-muted/40 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setShowRuns((v) => !v)}
              className={cn(
                'px-2 py-1 rounded transition-colors flex items-center gap-1 text-[11px]',
                showRuns ? 'bg-background shadow-xs text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t('Runs')}
            </button>
            <button
              type="button"
              onClick={() => setShowScheduled((v) => !v)}
              className={cn(
                'px-2 py-1 rounded transition-colors flex items-center gap-1 text-[11px]',
                showScheduled ? 'bg-background shadow-xs text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {t('Scheduled')}
            </button>
          </div>

          {/* View Mode Tabs (Week, Day, Agenda) */}
          <Tabs value={view} onValueChange={(v) => setView(v as CalendarViewType)} className="shrink-0">
            <TabsList className="h-8 p-0.5 bg-muted">
              <TabsTrigger value="week" className="h-7 text-xs px-2 sm:px-2.5">
                {t('Week')}
              </TabsTrigger>
              <TabsTrigger value="day" className="h-7 text-xs px-2 sm:px-2.5">
                {t('Day')}
              </TabsTrigger>
              <TabsTrigger value="agenda" className="h-7 text-xs px-2 sm:px-2.5">
                {t('Agenda')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Calendar Viewport */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative min-w-0">
        {view === 'agenda' ? (
          /* AGENDA LIST VIEW */
          <div className={cn('flex-1 overflow-auto py-4 space-y-3', 'px-4 sm:px-6')}>
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <CalendarIcon className="h-10 w-10 stroke-1 mb-2 opacity-50" />
                <p className="text-sm font-medium">{t('No automation runs or schedules in this range')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Try changing the date range or filters above.')}
                </p>
              </div>
            ) : (
              events
                .sort((a, b) => a.startTime.valueOf() - b.startTime.valueOf())
                .map((event) => (
                  <Card
                    key={event.id}
                    onClick={() => setActiveEvent(event)}
                    className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-xs"
                  >
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-2 h-9 rounded-full shrink-0',
                            event.isScheduled
                              ? 'bg-blue-500'
                              : event.status === FlowRunStatus.SUCCEEDED
                              ? 'bg-emerald-500'
                              : event.status === FlowRunStatus.FAILED
                              ? 'bg-rose-500'
                              : 'bg-amber-500',
                          )}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs sm:text-sm truncate">{event.title}</span>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 shrink-0" />
                              {event.startTime.format('DD MMM, HH:mm')} - {event.endTime.format('HH:mm')}
                            </span>
                            {event.cronExpression && (
                              <span className="bg-muted px-1.5 py-0.2 rounded font-mono text-[10px]">
                                {event.cronExpression}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {renderStatusBadge(event)}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        ) : (
          /* WEEK / DAY TIMEGRID VIEW (Responsive with Horizontal Scroll on Mobile/Tablet) */
          <div className="flex-1 min-h-0 flex flex-col overflow-x-auto overflow-y-hidden select-none">
            {/* Inner responsive wrapper: has min-width on week view so days don't get squished */}
            <div className={cn('flex flex-col flex-1 min-h-0', view === 'week' ? 'min-w-[720px] md:min-w-full' : 'min-w-full')}>
              {/* Scrollable Hours Grid (Header is sticky inside so scrollbar applies to both and columns align 100% symmetrically) */}
              <div ref={gridContainerRef} className="flex-1 overflow-y-auto relative flex flex-col">
                {/* Header Columns (Days) - Sticky at Top of Scroll Container */}
                <div className="flex border-b bg-card shrink-0 sticky top-0 z-30">
                  {/* Time Column Placeholder */}
                  <div className="w-14 sm:w-16 shrink-0 border-r py-2 px-1 text-right text-[10px] sm:text-xs text-muted-foreground font-mono sticky left-0 bg-card z-40">
                    GMT{dayjs().format('Z')}
                  </div>
                  {/* Day Columns */}
                  <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x">
                    {displayedDays.map((day, idx) => {
                      const isToday = day.isSame(dayjs(), 'day');
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'py-2 px-1 sm:px-2 flex flex-col items-center justify-center text-center',
                            isToday && 'bg-primary/5',
                          )}
                        >
                          <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase">
                            {day.format('ddd')}
                          </span>
                          <div
                            className={cn(
                              'w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold mt-0.5',
                              isToday && 'bg-primary text-primary-foreground',
                            )}
                          >
                            {day.format('D')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grid Body */}
                <div className="flex flex-1 relative">
                  {/* Time Labels (Left Column) */}
                  <div className="w-14 sm:w-16 shrink-0 border-r bg-background sticky left-0 z-20">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: `${HOUR_HEIGHT_PX}px` }}
                        className="border-b text-[10px] sm:text-[11px] font-mono text-muted-foreground text-right pr-1.5 sm:pr-2 pt-1"
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Day Grid Columns */}
                  <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x relative">
                    {displayedDays.map((day, dayIdx) => {
                      const isToday = day.isSame(dayjs(), 'day');
                      const dayStart = day.startOf('day');
                      const dayEnd = day.endOf('day');

                      // Filter events falling on this day
                      const dayEvents = events.filter(
                        (e) => e.startTime.isSame(day, 'day') || (e.startTime.isBefore(dayEnd) && e.endTime.isAfter(dayStart)),
                      );

                      return (
                        <div key={dayIdx} className="relative">
                          {/* Hour Grid Lines */}
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              style={{ height: `${HOUR_HEIGHT_PX}px` }}
                              className="border-b border-border/30 hover:bg-muted/10 transition-colors"
                            />
                          ))}

                          {/* Current Time Red Line Marker */}
                          {isToday && (
                            <div
                              className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                              style={{
                                top: `${(dayjs().hour() * 60 + dayjs().minute()) * (HOUR_HEIGHT_PX / 60)}px`,
                              }}
                            >
                              <div className="w-2 h-2 rounded-full bg-rose-500 -ml-1" />
                              <div className="flex-1 border-t-2 border-rose-500" />
                            </div>
                          )}

                          {/* Event Cards inside column */}
                          {dayEvents.map((event) => {
                            const topMinutes = event.startTime.hour() * 60 + event.startTime.minute();
                            const topPx = topMinutes * (HOUR_HEIGHT_PX / 60);
                            const durMin = Math.max(18, event.endTime.diff(event.startTime, 'minute'));
                            const heightPx = Math.max(24, durMin * (HOUR_HEIGHT_PX / 60));

                            return (
                              <div
                                key={event.id}
                                onClick={() => setActiveEvent(event)}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                }}
                                className={cn(
                                  'absolute left-0.5 right-0.5 sm:left-1 sm:right-1 z-10 rounded-md p-1 sm:p-1.5 text-xs cursor-pointer border shadow-xs transition-all hover:scale-[1.01] hover:z-30 overflow-hidden',
                                  event.isScheduled
                                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25'
                                    : event.status === FlowRunStatus.SUCCEEDED
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                                    : event.status === FlowRunStatus.FAILED
                                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
                                    : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25',
                                )}
                              >
                                <div className="font-semibold truncate flex items-center gap-1 leading-tight text-[11px] sm:text-xs">
                                  {event.isScheduled ? (
                                    <Clock className="w-3 h-3 shrink-0" />
                                  ) : (
                                    <PlayCircle className="w-3 h-3 shrink-0" />
                                  )}
                                  <span className="truncate">{event.title}</span>
                                </div>
                                <div className="text-[9px] sm:text-[10px] opacity-80 mt-0.5 font-mono">
                                  {event.startTime.format('HH:mm')}
                                  {durMin > 20 && ` - ${event.endTime.format('HH:mm')}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Dialog Modal */}
      {activeEvent && (
        <Dialog open={!!activeEvent} onOpenChange={(open) => !open && setActiveEvent(null)}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                {renderStatusBadge(activeEvent)}
                <span className="text-xs text-muted-foreground font-mono">
                  {activeEvent.startTime.format('DD MMM YYYY, HH:mm')}
                </span>
              </div>
              <DialogTitle className="text-base font-semibold">{activeEvent.title}</DialogTitle>
              <DialogDescription className="text-xs">
                {activeEvent.isScheduled
                  ? t('This is a scheduled run planned by cron expression.')
                  : t('Recorded flow execution result and metrics.')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('Start Time')}</span>
                <span className="font-medium font-mono">
                  {activeEvent.startTime.format('YYYY-MM-DD HH:mm:ss')}
                </span>
              </div>

              {activeEvent.durationMs !== undefined && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t('Duration')}</span>
                  <span className="font-medium">
                    {(activeEvent.durationMs / 1000).toFixed(2)}s
                  </span>
                </div>
              )}

              {activeEvent.cronExpression && (
                <div className="flex flex-col gap-1 border-b pb-2">
                  <span className="text-muted-foreground">{t('Schedule Expression')}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px]">
                      {activeEvent.cronExpression}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {(() => {
                        try {
                          return cronstrue.toString(activeEvent.cronExpression, { throwExceptionOnParseError: false });
                        } catch {
                          return activeEvent.cronExpression;
                        }
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate(`/flows/${activeEvent.flowId}`);
                  setActiveEvent(null);
                }}
                className="gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                {t('Open Flow')}
              </Button>

              {activeEvent.runId && (
                <Button
                  size="sm"
                  onClick={() => {
                    navigate(`/runs/${activeEvent.runId}`);
                    setActiveEvent(null);
                  }}
                  className="gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('View Run Details')}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
