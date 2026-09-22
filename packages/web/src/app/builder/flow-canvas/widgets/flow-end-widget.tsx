import { t } from 'i18next';

const FlowEndWidget = () => {
  return (
    <div
      className="text-center w-[45px] bg-builder-background text-foreground rounded-md animate-fade -ml-[22px]"
      key={'flow-end-button'}
      id="flow-end-button"
    >
      <div className="w-full text-center text-xs font-medium h-full bg-muted text-foreground/80 border border-border py-1 px-2 rounded-md shadow-xs">
        {t('End')}
      </div>
    </div>
  );
};

FlowEndWidget.displayName = 'FlowEndWidget';
export default FlowEndWidget;
