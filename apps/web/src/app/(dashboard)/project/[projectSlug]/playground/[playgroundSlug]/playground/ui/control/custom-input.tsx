import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { ClassicPreset } from "rete";

export function CustomInput(props: {
  data: ClassicPreset.InputControl<"text">;
}) {
  const [value, setValue] = useState(props.data.value);

  useEffect(() => {
    setValue(props.data.value);
  }, [props.data.value]);

  return (
    <Input
      id={props.data.id}
      disabled={props.data.readonly}
      value={value}
      onChange={(e) => {
        setValue(e.target.value as string);
        props.data.setValue(e.target.value as string);
      }}
    />
  );
}