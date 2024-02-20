import "./custom-input.css";
import _ from "lodash";
import { usePreviousDistinct } from "react-use";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  javascript,
  javascriptLanguage,
  typescriptLanguage,
} from "@codemirror/lang-javascript";

// @ts-ignore
import jsdoc from "json-schema-to-jsdoc";

require("tern/plugin/doc_comment");
import tern from "tern";

import {
  Completion,
  CompletionContext,
  autocompletion,
  startCompletion,
} from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";

import {
  Decoration,
  DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  ViewUpdate,
  keymap,
} from "@codemirror/view";
import { vscodeKeymap } from "@replit/codemirror-vscode-keymap";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";

import CodeMirror, { WidgetType } from "@uiw/react-codemirror";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";

import { useSelector } from "@xstate/react";
import { useTheme } from "next-themes";

import type { InputControl } from "@seocraft/core/src/controls/input.control";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api } from "@/trpc/react";
import { Icons } from "@/components/icons";
import { P, match } from "ts-pattern";
import { Badge } from "@/components/ui/badge";

import ecma from "@seocraft/core/src/worker/autocomplete/definitions/ecmascript.json";
import lodash from "@seocraft/core/src/worker/autocomplete/definitions/lodash.json";
import base64 from "@seocraft/core/src/worker/autocomplete/definitions/base64-js.json";
import moment from "@seocraft/core/src/worker/autocomplete/definitions/moment.json";
import forge from "@seocraft/core/src/worker/autocomplete/definitions/forge.json";
import { start } from "@seocraft/core/src/worker/main";
import { isNil } from "lodash-es";
import { WorkerMessenger } from "@seocraft/core/src/worker/messenger";
import { JSONSchema } from "openai/lib/jsonschema";
import { ControlContainer } from "../control-container";

class SecretWidget extends WidgetType {
  constructor(readonly value: string = "") {
    super();
  }

  eq(other: SecretWidget) {
    return other.value == this.value;
  }

  toDOM() {
    let wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "true");
    wrap.className =
      "py-1 px-2 rounded bg-primary border-foreground/50 shadow text-primary-foreground font-mono text";
    wrap.innerText = this.value;
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

const secretMatcher = new MatchDecorator({
  regexp: /\(?await\s+getSecret\("(.+?)"\)\)?/g,
  decoration: (match) =>
    Decoration.replace({
      widget: new SecretWidget(match[1]),
    }),
});

const secret = ViewPlugin.fromClass(
  class {
    secrets: DecorationSet;
    constructor(view: EditorView) {
      this.secrets = secretMatcher.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.secrets = secretMatcher.updateDeco(update, this.secrets);
    }
  },
  {
    decorations: (instance) => instance.secrets,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.secrets || Decoration.none;
      }),
  },
);

export function CustomInput(props: { data: InputControl }) {
  console.log("CustomInput", props.data);
  const isCode = (props.data.definition as any).format === "expression";
  const value = useSelector(props.data?.actor, props.data.selector);
  // const [value, setValue] = useState(initialValue);
  const { systemTheme } = useTheme();

  // XXX: Normally we would use the top level worker for this,
  // but it is hidden somewhere in the core and we can't access it.
  // const [worker, setWorker] = useState<WorkerMessenger | null>(null);
  // const { current: ternServer } = useRef(createTernServer());

  const getFile = useCallback((ts: any, name: any, c: any) => value, [value]);
  const parseValue = useCallback(parseValueFN, []);

  const libraries: string[] = props.data.definition["x-libraries"] || [];
  const librariesOld = usePreviousDistinct(libraries, (p, n) =>
    _.isEqual(p, n),
  );

  // useEffect(() => {
  //   if (!isCode) return;
  //   const worker_ = start();
  //   setWorker(worker_);
  //   return () => worker_.destroy();
  // }, []);

  // useEffect(() => {
  //   if (!worker || !isCode) {
  //     return;
  //   }

  //   const toInstall = _.difference(libraries, librariesOld || []);
  //   const toRemove = _.difference(librariesOld || [], libraries);
  //   if (toInstall.length === 0 && toRemove.length === 0) return;

  //   (async () => {
  //     // First we reset the worker context so we can re-install
  //     // libraries to remove to get their defs generated.
  //     await worker.postoffice.resetJSContext();
  //     for (const lib of toRemove) {
  //       if (!lib) continue;
  //       const resp = await worker.postoffice.installLibrary(lib);
  //       ternServer.deleteDefs(resp.defs["!name"]);
  //     }

  //     // Now we can clean install the libraries we want.
  //     await worker.postoffice.resetJSContext();
  //     for (const lib of toInstall) {
  //       if (!lib) continue;
  //       const resp = await worker.postoffice.installLibrary(lib);
  //       ternServer.addDefs(resp.defs);
  //     }
  //   })();
  // }, [libraries, worker]);

  const handledChange = (val: string) => {
    // setValue(val);
    props.data.setValue(val);
    const res = parseValue(val);
    match(res)
      .with({ expression: P.string }, () => {
        if (props.data.definition?.format === "expression") return;
        props.data.actor.send({
          type: "UPDATE_SOCKET",
          params: {
            name: props.data.definition["x-key"],
            side: "input",
            socket: {
              format: "expression",
            },
          },
        });
      })
      .with({ secretKey: P.string }, () => {
        if (props.data.definition?.format === "secret") return;
        props.data.actor.send({
          type: "UPDATE_SOCKET",
          params: {
            name: props.data.definition["x-key"],
            side: "input",
            socket: {
              format: "secret",
            },
          },
        });
      })
      .otherwise(() => {
        if (isNil(props.data.definition?.format)) return;
        props.data.actor.send({
          type: "UPDATE_SOCKET",
          params: {
            name: props.data.definition["x-key"],
            side: "input",
            socket: {
              format: undefined,
            },
          },
        });
      });
  };

  // const { data: creds } = api.credentials.list.useQuery({});
  // const [open, setOpen] = useState(false);

  // const cdnPackageCompletions = javascriptLanguage.data.of({
  //   autocomplete: autocompleteProvider,
  // });

  return (
    <ControlContainer id={props.data.id} definition={props.data.definition}>
      {/* <div className="flex w-full items-center justify-between">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start" size="sm">
              <Icons.key className="mr-2 h-4 w-4" />
              Secret
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" side="right" align="start">
            <Command>
              <CommandInput placeholder="Search Secret" />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {creds?.map((cred) => (
                    <CommandItem
                      key={cred.id}
                      value={cred.key}
                      onSelect={(value) => {
                        console.log(value);
                        handledChange(`(await getSecret("${value}"))`);
                        setOpen(false);
                      }}
                    >
                      <div className="flex w-full items-center justify-between">
                        {cred.key}
                        {cred.default && (
                          <Badge className="ml-2 bg-green-400/80">
                            Default
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div> */}
      <CodeMirror
        id={props.data.id}
        readOnly={props.data.options.readonly}
        value={String(value)}
        theme={systemTheme === "dark" ? githubDark : githubLight}
        extensions={[
          secret,
          javascript({ jsx: false }),
          // autocompletion({
          //   activateOnTyping: true,
          //   activateOnTypingDelay: 300,
          //   optionClass: (completion) => {
          //     return `cm-completion cm-completion-${completion.type}`;
          //   },
          // }),
          // cdnPackageCompletions,
          keymap.of(vscodeKeymap),
          keymap.of([
            { key: "c-Space", run: startCompletion },
            { key: "Mod-Space", run: startCompletion },
            indentWithTab,
          ]),
          indentationMarkers(),
        ]}
        className="bg-muted/30 w-full rounded-lg p-2 outline-none"
        width="100%"
        height="100%"
        basicSetup={{
          lineNumbers: false,
          autocompletion: true,
          foldGutter: false,
        }}
        onChange={(val, viewUpdate) => {
          // console.log("VALUE CHANGED", val);
          handledChange(val);
        }}
      />
    </ControlContainer>
  );

  function createTernServer() {
    return new tern.Server({
      async: true,
      defs: [ecma as any, lodash, base64, moment, forge],
      plugins: {
        doc_comment: {},
      },
      getFile: function (name, c) {
        return getFile(self, name, c);
      },
    });
  }

  async function autocompleteProvider(context: CompletionContext) {
    let before = context.matchBefore(/\w+/);
    let completions = await getAutocompletion(
      context.state.doc.toString(),
      context.state.selection.main.head,
    );

    if (!context.explicit && !before) {
      return null;
    }

    return {
      from: before ? before.from : context.pos,
      options: completions as Completion[],
      validFor: /^\w*$/,
    };
  }

  async function getAutocompletion(code: string, position: number) {
    const schema = {
      title: "Inputs",
      type: "object",
      properties: {
        // name: { type: "string", description: "A person's name" },
        // age: { type: "integer", description: "A person's age" },
        // school: { type: "number", description: "A person's age" },
      },
      required: [],
    };

    const jsdoc = generateSignatureJSDOC(schema);
    const query: tern.Query = {
      types: true,
      docs: true,
      urls: true,
      includeKeywords: true,
      type: "completions",
      end: position + jsdoc.length,
      file: "temp.js",
    };

    const file: tern.File = {
      type: "full",
      name: "temp.js",
      // TODO: Pass correct inputs and their types.
      text: jsdoc + code,
    } as any;
    console.log(jsdoc + code);

    return new Promise<Completion[]>((resolve, reject) => {
      ternServer?.request({ query, files: [file] }, (error, res: any) => {
        if (error) {
          return reject(error);
        }
        resolve(
          res?.completions
            .map(
              (item: any) =>
                ({
                  label: item.name,
                  apply: item.name,
                  // detail: item.type && `${item.type}`,
                  type: item.isKeyword ? "keyword" : typeToIcon(item.type),
                  info: item.doc,
                }) as Completion,
            )
            .filter((c: Completion) => !!c.label),
        );
      });
    });
  }
}

// Got from tern.js for CM5
// Base CM6 Autocomplete library defines simple icons for
// class, constant, enum, function, interface, keyword,
// method, namespace, property, text, type, and variable.
//
// TODO: Extend this to support more types. We also need icons if we do so.
// prettier-ignore
function typeToIcon(type: any) {
  var suffix;
  if (type == "?") suffix = "unknown";
  else if (type == "number" || type == "string" || type == "bool") suffix = type;
  else if (/^fn\(/.test(type)) suffix = "function";
  else if (/^\[/.test(type)) suffix = "array";
  else suffix = "object";
  return suffix;
}

function parseValueFN(value: string) {
  const secret = /^\(?await getSecret\("([^"]+)"\)\)?$/;
  const expression = /^ctx\["root"\](?:\["[^"]+"\])+$/;

  if (secret.test(value)) {
    const key = value?.match(secret)?.[1];
    if (!key) return value;
    return { secretKey: key };
  }

  if (expression.test(value)) {
    return { expression: value };
  }

  return value;
}

/**
 * Generate JSDOC signature for the given inputs.
 */
function generateSignatureJSDOC(schema: JSONSchema) {
  const typedef = jsdoc(schema);

  return `\
${typedef}

/**
 * @typedef {object} Context
 * @property {Inputs} inputs
 */

/**
 * @param {Context} context
 */\n`;
}
