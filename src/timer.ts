export interface Timer {
  stop: () => number;
}

export function startTimer(): Timer {
  const start = process.hrtime.bigint();

  return {
    stop: () => {
      const end = process.hrtime.bigint();
      const elapsedNs = end - start;
      return Number(elapsedNs) / 1_000_000;
    }
  };
}
