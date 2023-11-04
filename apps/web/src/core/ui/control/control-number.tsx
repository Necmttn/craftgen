import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import type { NumberControl } from "@seocraft/core/src/controls/number";


export function NumberControlComponent(props: { data: NumberControl }) {
  const [value, setValue] = useState<number>(props.data.value);
  const handleChange = (value: number) => {
    setValue(value);
    props.data.setValue(value);
  };
  useEffect(() => {
    setValue(props.data.value);
  }, [props.data.value]);
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => handleChange(Number(e.target.value))}
    />
  );
}
