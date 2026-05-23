export function LoadingState() {
  return (
    <div className="state-panel state-panel--loading">
      <div className="loading-ring" />
      <div>
        <p className="state-panel__title">正在拉取赛程</p>
        <p className="state-panel__copy">正在同步北京时间下的比赛列表。</p>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-panel state-panel--error">
      <div>
        <p className="state-panel__title">赛程数据暂时获取失败</p>
        <p className="state-panel__copy">{message}</p>
      </div>
      <button className="primary-button" onClick={onRetry} type="button">
        重试
      </button>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="state-panel state-panel--empty">
      <p className="state-panel__title">暂无比赛</p>
      <p className="state-panel__copy">{message}</p>
    </div>
  );
}
