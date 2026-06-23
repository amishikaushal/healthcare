import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'patient' | 'caregiver' | 'doctor' | 'admin'
  patientId?: string
  doctorId?: string
  avatarUrl?: string
  isEmailVerified: boolean
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  setUser: (user: AuthUser) => void
  setTokens: (access: string, refresh: string) => void
  logout: () => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'recoveryos-auth',
      // sessionStorage clears when the browser/tab is closed,
      // forcing the user to sign in again on every fresh open.
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
