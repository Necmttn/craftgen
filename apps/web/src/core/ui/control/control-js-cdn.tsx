import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { JsCdnController } from "@seocraft/core/src/controls/js-cdn";
import { useSelector } from "@xstate/react";
import { X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";

export const JsCdnControlComponent = (props: { data: JsCdnController }) => {
  const libraries = useSelector(props.data.actor, props.data.selector);
  const form = useForm<{
    libraries: { url: string }[];
  }>({
    defaultValues: {
      libraries: libraries.map((url) => ({ url })),
    },
    values: {
      libraries: libraries.map((url) => ({ url })),
    },
    mode: "onBlur",
  });

  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray(
    {
      control: form.control, // control props comes from useForm (optional: if you are using FormContext)
      name: "libraries", // unique name for your Field Array
    },
  );
  const onSubmit = (data?: any) => {
    const fieldsValue = form.getValues();
    props.data.setValue(fieldsValue.libraries.map((d: any) => d.url));
  };
  const handleAppend = () => {
    append({ url: "" });
    onSubmit();
  };
  const handleRemove = (index: number) => {
    remove(index);
    onSubmit();
  };
  return (
    <div className="rounded border p-2">
      <Form {...form}>
        <form
          onChange={form.handleSubmit(onSubmit)}
          className="flex h-full flex-col"
        >
          <h4 className="mb-4">
            Libraries
            <span className="text-muted-foreground ml-4 text-sm">
              (cdn packages)
            </span>
          </h4>

          {fields.length === 0 && (
            <div className="text-muted-foreground flex items-center justify-center text-sm">
              No library added yet
            </div>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center">
              <div
                key={`field.${index}`}
                className="@container relative mb-4 flex w-full flex-col rounded border px-2 py-1 shadow"
              >
                <div className="absolute right-2 top-2">
                  <Button
                    type={"button"}
                    variant={"ghost"}
                    onClick={() => handleRemove(index)}
                  >
                    <X />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <FormField
                    control={form.control}
                    name={`libraries.${index}.url`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JS module</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="craftgen"
                            {...field}
                            autoComplete="false"
                          />
                        </FormControl>
                        <FormDescription>cdn package url</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" onClick={handleAppend}>
            Add Library
          </Button>
        </form>
      </Form>
    </div>
  );
};
