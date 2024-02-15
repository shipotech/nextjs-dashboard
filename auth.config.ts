import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
	pages: {
		signIn: '/login',
	},
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user
			const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')

			// If the user is on the dashboard, they must be logged in
			if (isOnDashboard) {
				if (isLoggedIn) return true

				return false // Redirect unauthenticated users to login page
			} else if (isLoggedIn) {
				// If the user is logged in and not on the dashboard, redirect to the dashboard
				return Response.redirect(new URL('/dashboard', nextUrl))
			}

			return true
		},
	},
	providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig
