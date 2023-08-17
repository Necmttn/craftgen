import { ClassicPreset } from "rete";
import { DiContainer } from "../editor";
// import { generateTextFn } from "../actions";
import { SelectControl } from "../ui/control/control-select";
import { OPENAI_CHAT_MODELS } from "ai-utils.js";
import { BaseNode, NodeData } from "./base";
import { createMachine } from "xstate";
import { stringSocket, triggerSocket } from "../sockets";

type OPENAI_CHAT_MODELS_KEY = keyof typeof OPENAI_CHAT_MODELS;

type Data = {
  model: OPENAI_CHAT_MODELS_KEY;
  message: string;
};

const OpenAIFunctionCallMachine = createMachine({
  id: "openai-function-call",
  initial: "idle",
  context: {
    model: "gpt-3.5-turbo",
    message: "",
  },
  states: {
    idle: {},
    running: {},
  },
});

export class OpenAIFunctionCall extends BaseNode<
  typeof OpenAIFunctionCallMachine,
  {
    prompt: typeof stringSocket;
    exec: typeof triggerSocket;
  },
  { message: ClassicPreset.Socket },
  {
    model: SelectControl<OPENAI_CHAT_MODELS_KEY>;
    prompt: ClassicPreset.InputControl<"text">;
  }
> {
  height = 420;
  width = 280;

  static ID: "openai-function-call";

  constructor(
    di: DiContainer,
    data: NodeData<typeof OpenAIFunctionCallMachine>
  ) {
    super("OpenAI Function Call", di, data, OpenAIFunctionCallMachine, {});
    this.di = di;
    this.addInput("exec", new ClassicPreset.Input(triggerSocket, "Exec", true));
    const self = this;
    const state = this.actor.getSnapshot();
    this.addControl(
      "model",
      new SelectControl<OPENAI_CHAT_MODELS_KEY>(
        state.context.model,
        "Model",
        [
          ...Object.keys(OPENAI_CHAT_MODELS).map((key) => ({
            key: key as OPENAI_CHAT_MODELS_KEY,
            value: key,
          })),
        ],
        (value) => {
          console.log("select value changed", value);
        }
      )
    );

    const input = new ClassicPreset.Input(stringSocket, "Prompt");
    this.addInput("prompt", input);

    this.addOutput(
      "message",
      new ClassicPreset.Output(stringSocket, "Message")
    );
  }

  async execute(input: any, forward: (output: "message") => void) {
    console.log("aaa", this);
    const inputs = (await this.di?.dataFlow?.fetchInputs(this.id)) as {
      prompt?: string;
      message: string[];
    };
    const control = this.inputs.prompt?.control;

    forward("message");

    // const res = await generateTextFn({
    //   model: this.controls.model.value,
    //   system: "You are a story write.",
    //   instruction: "Write a story about a story writer.",
    // });

    console.log("executing", "openai-function-call", inputs, control);
  }

  data() {
    const state = this.actor.getSnapshot();
    return {
      message: "",
    };
  }

  serialize() {
    return {
      message: "",
    };
  }
}
