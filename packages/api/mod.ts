import { z } from "./deps.ts";
import { helloRouter } from "./router/hello.ts";
import { createTRPCRouter, publicProcedure } from "./trpc.ts";

export { createTRPCContext } from "./trpc.ts";

export const appRouter = createTRPCRouter({
  hello: helloRouter,
  toast: publicProcedure.input(z.string().nullish()).query(({ input }) => {
    return `Hey ${input ?? "World"}!`;
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
