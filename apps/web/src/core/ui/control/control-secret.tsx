import { useMemo, useState } from "react";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { useSelector } from "@xstate/react";
import { CheckIcon } from "lucide-react";

import { SecretController } from "@seocraft/core/src/controls/secret";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ChangeFormat } from "./shared/change-format";
import { useUser } from "@/app/(dashboard)/hooks/use-user";

export function SecretControlComponent(props: { data: SecretController }) {
  const { definition, value: valueActor } = useSelector(
    props.data?.actor,
    (snap) => snap.context,
  );

  const key = useSelector(valueActor, (snap) => snap.context.value);

  const [open, setOpen] = useState(false);
  const { data: user } = useUser();
  const { data: values } = api.credentials.list.useQuery(
    {},
    {
      initialData: [],
      enabled: !!user,
    },
  );
  const value = useMemo(() => {
    return values?.find((entry) => entry.key === key)?.id;
  }, [key, values]);

  const handleChange = (val: string) => {
    props.data.actor.send({
      type: "SET_VALUE",
      params: {
        value: values.find((entry) => entry.id === val)?.key,
      },
    });
  };
  return (
    <>
      <div className="flex w-full items-center justify-end">
        <ChangeFormat value={value} actor={props.data.actor} />
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={!user}
            className="w-full justify-between"
          >
            {value
              ? values && values.find((entry) => entry.id === value)?.key
              : "Select Secret"}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput
              placeholder={definition.title || definition.description}
              className="h-9"
            />
            <CommandEmpty>No {props.data.definition.name} found.</CommandEmpty>
            <CommandGroup>
              {values &&
                values.map((entry) => (
                  <CommandItem
                    key={entry.key}
                    value={entry.id}
                    onSelect={(currentValue) => {
                      handleChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    {entry.key}
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === entry.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
