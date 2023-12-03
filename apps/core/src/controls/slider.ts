import { AnyActor, SnapshotFrom } from "xstate";

import { BaseControl } from "./base";
import { JSONSocket } from "./socket-generator";

export type SliderControlOptions = {
  max: number;
  min: number;
  step?: number;
  change: (value: number) => void;
};

export class SliderControl<T extends AnyActor = AnyActor> extends BaseControl {
  __type = "slider";

  get step(): number {
    if (this.options.step) return this.options.step;
    if (this.options.max === 1 && this.options.min === 0) {
      return 0.01;
    }
    // Helper function to find the decimal place count
    // Helper function to find the decimal place count
    function decimalPlaceCount(value: number): number {
      if (!isFinite(value)) return 0;
      let e = 1,
        p = 0;
      while (Math.round(value * e) / e !== value) {
        e *= 10;
        p++;
      }
      return p;
    }

    // Determine the decimal places for min, max, and default
    const minDecimals = decimalPlaceCount(this.options.min);
    const maxDecimals = decimalPlaceCount(this.options.max);

    const defaultDecimals =
      this.definition?.default !== undefined
        ? decimalPlaceCount(Number(this.definition?.default!))
        : 0;

    // Use the highest decimal count as the step size
    const step = Math.pow(
      10,
      -Math.max(minDecimals, maxDecimals, defaultDecimals),
    );
    return step;
  }

  constructor(
    public actor: T,
    public selector: (snapshot: SnapshotFrom<T>) => number, // Function that returns the observable value
    public options: SliderControlOptions,
    public readonly definition?: JSONSocket,
  ) {
    super(55, definition);
  }

  setValue(value: number) {
    if (this.options?.change) this.options.change(value);
  }
}
