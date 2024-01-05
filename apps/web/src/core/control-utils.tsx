import type { ControllerRenderProps } from "react-hook-form";

import type { SocketNameType } from "@seocraft/core/src/sockets";

import { Input } from "@/components/ui/input";

export const renderField = (type: string, field: ControllerRenderProps) => {
  switch (type) {
    case "string":
      return <Input defaultValue={""} placeholder="craftgen" {...field} />;
    case "number":
      return (
        <Input
          defaultValue={0}
          type="number"
          placeholder="123"
          {...field}
          onChange={(e) => field.onChange(Number(e.target.value))}
        />
      );
    case "boolean":
      return <Input type="checkbox" {...field} />; // TODO: Check this guy out
    default:
      return null;
  }
};

export const renderFieldBaseOnSocketType = (
  type: SocketNameType,
  field: ControllerRenderProps,
) => {
  switch (type) {
    case "String":
      return <Input placeholder="craftgen" {...field} />;
    case "Number":
      return (
        <Input
          type="number"
          placeholder="123"
          {...field}
          onChange={(e) => field.onChange(Number(e.target.value))}
        />
      );
    case "Boolean":
      return <Input type="checkbox" {...field} />;
    default:
      return null;
  }
};

export const renderControlBaseOnSocketType = (
  type: SocketNameType,
  field: ControllerRenderProps,
) => {
  switch (type) {
    case "String":
    // return new Contro
    //   return <Input placeholder="craftgen" {...field} />;
    // case "Number":
    //   return (
    //     <Input
    //       type="number"
    //       placeholder="123"
    //       {...field}
    //       onChange={(e) => field.onChange(Number(e.target.value))}
    //     />
    //   );
    // case "Boolean":
    //   return <Input type="checkbox" {...field} />;
    default:
      return null;
  }
};
