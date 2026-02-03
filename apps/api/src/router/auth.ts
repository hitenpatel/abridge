import { protectedProcedure, publicProcedure, router } from "../trpc";

export const authRouter = router({
	getSession: publicProcedure.query(({ ctx }) => {
		return ctx.user;
	}),
	getSecretMessage: protectedProcedure.query(({ ctx }) => {
		const displayName = ctx.user.name || ctx.user.email.split("@")[0];
		return `Hello ${displayName}, this is a secret message!`;
	}),
});
