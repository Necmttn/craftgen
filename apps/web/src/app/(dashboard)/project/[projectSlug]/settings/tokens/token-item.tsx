"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Eye, EyeOff, MinusCircle, PlusCircle } from "lucide-react";
import { Control, useFieldArray, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Separator } from "@/components/ui/separator";
import type { ResultOf } from "@/lib/type";
import { cn } from "@/lib/utils";

import {
  deleteProjectToken,
  getProjectTokens,
  insertProjectTokens,
  updateProjectToken,
} from "../../actions";
import { useProject } from "../../hooks/use-project";

const tokenSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});
const formSchema = z.object({
  tokens: z.array(tokenSchema),
});

export const TokenList: React.FC<{
  tokens: ResultOf<typeof getProjectTokens>;
}> = ({ tokens }) => {
  const { data: project } = useProject();
  const { data: tokensData } = useSWR(
    `/api/project/${project?.id}/tokens`,
    () => getProjectTokens({ project_id: project?.id! }),
    { fallbackData: tokens },
  );
  return (
    <div className="space-y-4">
      {tokensData && (
        <>
          <TokenListNew tokens={tokensData} />
          {tokensData?.length > 0 && (
            <>
              <Separator />
              <ExistingTokenList tokens={tokensData} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export const TokenListNew: React.FC<{
  tokens: ResultOf<typeof getProjectTokens>;
}> = ({ tokens }) => {
  const { data: project } = useProject();
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      tokens: [
        {
          key: "",
          value: "",
        },
      ],
    },
    mode: "onBlur",
    resolver: zodResolver(formSchema),
  });
  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray(
    {
      control: form.control, // control props comes from useForm (optional: if you are using FormContext)
      name: "tokens", // unique name for your Field Array
    },
  );

  const onSubmit = async (data?: z.infer<typeof formSchema>) => {
    console.log(data);
    await insertProjectTokens({
      project_id: project?.id!,
      tokens: data?.tokens!,
    });
    mutate(`/api/project/${project?.id}/tokens`);
  };

  return (
    <Card>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex h-full flex-col"
        >
          <CardHeader>
            <CardTitle>Add new token</CardTitle>
            <CardDescription>
              Tokens are used to store sensitive information such as API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fields.map((token, index) => (
              <div
                className="flex items-start justify-center space-x-2"
                key={`token-${token.id}`}
              >
                <FormField
                  control={form.control}
                  name={`tokens.${index}.key`}
                  render={({ field }) => (
                    <FormItem className="flex-1 justify-start">
                      <FormLabel
                        className={cn(index === 0 ? "block" : "hidden")}
                      >
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e. g STRIPE_API_KEY" {...field} />
                      </FormControl>
                      <FormDescription
                        className={cn(
                          index === fields.length - 1 ? "block" : "hidden",
                        )}
                      >
                        This is the name of your token
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`tokens.${index}.value`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel
                        className={cn(index === 0 ? "block" : "hidden")}
                      >
                        Value
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="sk_*****" {...field} />
                      </FormControl>
                      <FormDescription
                        className={cn(
                          index === fields.length - 1 ? "block" : "hidden",
                        )}
                      >
                        This is the value of your token
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  variant={"ghost"}
                  className="my-auto"
                  onClick={() => {
                    console.log("removing", index);
                    remove(index);
                  }}
                  disabled={fields.length === 1}
                >
                  <MinusCircle />
                </Button>
              </div>
            ))}
            <Button
              onClick={() => append({ key: "", value: "" })}
              variant={"outline"}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Add Another</span>
            </Button>
          </CardContent>
          <CardFooter className="flex items-center justify-end">
            <Button type="submit">Save</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export const ExistingTokenList: React.FC<{
  tokens: ResultOf<typeof getProjectTokens>;
}> = ({ tokens }) => {
  const [edit, setEdit] = useState<string | null>(null);
  return (
    <div className="">
      {tokens.map((token, index) => (
        <TokenItem
          key={`token-${token.id}`}
          token={token}
          isOpen={edit === token.id}
          setOpen={(value) => setEdit(value)}
        />
      ))}
    </div>
  );
};

export const TokenItem: React.FC<{
  token: ResultOf<typeof getProjectTokens>[number];
  isOpen: boolean;
  setOpen: (id: string | null) => void;
}> = ({ token, isOpen, setOpen }) => {
  const { data: project } = useProject();
  const form = useForm<z.infer<typeof tokenSchema>>({
    defaultValues: {
      key: token.key,
      value: token.value || "",
    },
    resolver: zodResolver(tokenSchema),
  });
  const onSubmit = async (data: z.infer<typeof tokenSchema>) => {
    await updateProjectToken({ id: token.id, ...data });
    mutate(`/api/project/${project?.id}/tokens`);
    setOpen(null);
  };
  const handleDelete = async () => {
    await deleteProjectToken({ id: token.id });
    mutate(`/api/project/${project?.id}/tokens`);
  };

  return (
    <div className="w-full border first:rounded-t-lg last:rounded-b-lg ">
      <div className="grid grid-cols-6 p-4">
        <div className="col-span-2">
          <span className="bg-muted rounded p-1 font-bold">{token.key}</span>
        </div>
        <div className="col-span-3">
          {token.value ? (
            <ToggleView value={token.value} />
          ) : (
            <Badge variant={"destructive"}>
              <span className="text-sm">Not set</span>
            </Badge>
          )}
        </div>
        <div className="col-span-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted flex h-8 w-8 p-0"
              >
                <DotsHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setOpen(token.id)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                about="Remove this token"
                disabled={token.system}
                onSelect={handleDelete}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isOpen && (
        <Form {...form}>
          <Separator className="  w-full " />
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="p-4 ">
              <FormField
                control={form.control}
                name={`key`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g OPENAI_API_KEY"
                        {...field}
                        disabled={token.system}
                      />
                    </FormControl>
                    <FormDescription>This is key</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input placeholder="sk_*****" {...field} />
                    </FormControl>
                    <FormDescription>This is key</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator className="  w-full " />
            <div className="flex justify-end p-4">
              <Button
                type="button"
                variant={"ghost"}
                onClick={() => setOpen(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

const ToggleView: React.FC<{ value: string }> = ({ value }) => {
  const [show, setShow] = useState(false);
  const toggleView = () => setShow((prev) => !prev);
  return (
    <div className="flex flex-row space-x-2">
      <Button onClick={toggleView} variant={"ghost"}>
        {show ? <Eye /> : <EyeOff />}
      </Button>
      <Input
        type={show ? "text" : "password"}
        className={cn(!show && "bg-muted/50 border-none")}
        value={value}
        readOnly
      />
    </div>
  );
};
