import { ClassicPreset } from "rete";
export type SelectControlOptions<T extends string> = {
  change: (value: T) => void;
  placeholder: string;
  values: { key: T; value: string }[];
};

export class SelectControl<T extends string> extends ClassicPreset.Control {
  __type = "select";

  constructor(
    public value: T | undefined,
    public options: SelectControlOptions<T>
  ) {
    super();
  }

  setValue(value: T) {
    this.value = value;
    if (this.options.change) this.options.change(value);
  }
}
