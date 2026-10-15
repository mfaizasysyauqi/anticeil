import { t } from 'i18next';
import { Calendar as CalendarIcon, List } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { RunsTable } from '@/features/flow-runs';
import { cn } from '@/lib/utils';

import AutomationCalendarPage from '../calendar';

const RunsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') === 'calendar' ? 'calendar' : 'table';

  const setView = (v: 'table' | 'calendar') => {
    const params = new URLSearchParams(searchParams);
    if (v === 'table') {
      params.delete('view');
    } else {
      params.set('view', 'calendar');
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1 shrink-0 border-b bg-card/20">
        <span className="text-xs text-muted-foreground font-medium">
          {currentView === 'calendar' ? t('Calendar Timeline View') : t('Executions History')}
        </span>
        <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 text-xs">
          <Button
            variant={currentView === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('table')}
            className={cn('h-7 text-xs gap-1.5 px-3', currentView === 'table' && 'shadow-xs font-medium')}
          >
            <List className="w-3.5 h-3.5" />
            {t('Table')}
          </Button>
          <Button
            variant={currentView === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('calendar')}
            className={cn('h-7 text-xs gap-1.5 px-3', currentView === 'calendar' && 'shadow-xs font-medium')}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            {t('Calendar')}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {currentView === 'calendar' ? <AutomationCalendarPage /> : <RunsTable />}
      </div>
    </div>
  );
};

export { RunsPage };
