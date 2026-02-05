// Mock tRPC hooks that return configurable data
export function createMockTRPC() {
	return {
		dashboard: {
			getSummary: { useQuery: jest.fn() },
		},
		messaging: {
			listReceived: { useInfiniteQuery: jest.fn() },
			markRead: {
				useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
			},
		},
		calendar: {
			listEvents: { useQuery: jest.fn() },
		},
		attendance: {
			getAttendanceForChild: { useQuery: jest.fn() },
			reportAbsence: {
				useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
			},
		},
		payments: {
			listOutstandingPayments: { useQuery: jest.fn() },
			createCheckoutSession: {
				useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
			},
		},
		search: {
			query: { useQuery: jest.fn() },
		},
		user: {
			listChildren: { useQuery: jest.fn() },
			updatePushToken: {
				useMutation: jest.fn(() => ({ mutateAsync: jest.fn() })),
			},
		},
		useUtils: jest.fn(() => ({
			messaging: { listReceived: { invalidate: jest.fn() } },
		})),
	};
}
