import type { SessionTurn, TimingSummary } from '../../domain/entities/session.js';

export function computeTimingSummary(turns: SessionTurn[]): TimingSummary {
  const delays = turns.flatMap((turn) => {
    const items = [turn.mainResponseDelaySec];
    if (typeof turn.followUpResponseDelaySec === 'number') {
      items.push(turn.followUpResponseDelaySec);
    }
    return items;
  });

  const avgResponseDelaySec = delays.length
    ? Number((delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(2))
    : 0;

  const longPausesCount = delays.filter((delay) => delay > 4).length;

  return {
    avgResponseDelaySec,
    longPausesCount,
    totalTurns: delays.length
  };
}
