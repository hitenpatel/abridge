import { protectedProcedure, publicProcedure, router } from "../trpc";

export const authRouter = router({
	getSession: publicProcedure.query(({ ctx }) => {
		return ctx.user;
	}),
	getSecretMessage: protectedProcedure.query(({ ctx }) => {
		return `Hello ${ctx.user.name}, this is a secret message!`;
	}),
});
