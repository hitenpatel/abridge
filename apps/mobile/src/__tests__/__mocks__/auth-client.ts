export const mockAuthClient = {
	useSession: jest.fn(() => ({ data: null, isPending: false })),
	signIn: { email: jest.fn() },
	signOut: jest.fn(),
};
