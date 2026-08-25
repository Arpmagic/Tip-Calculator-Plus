import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { INITIAL_USER } from '../data/mockData';

const USER_STORAGE_KEY = 'tip_calc_user_session';
const LEGACY_STORAGE_KEY = 'tip_calc_user';

export interface UserContextType {
  user: UserProfile;
  isAuthenticated: boolean;
  updateUser: (updatedFields: Partial<UserProfile>) => void;
  signIn: (authenticatedUser: UserProfile) => void;
  signOut: () => void;
  upgradeToPro: (plan?: 'lifetime' | 'monthly' | 'annual') => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Hydrates user profile safely from local storage.
 * Preserves custom nicknames, emails, and Pro states across restarts/updates.
 */
function hydrateInitialUser(): UserProfile {
  try {
    const rawSaved = localStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!rawSaved) {
      return INITIAL_USER;
    }

    const parsed = JSON.parse(rawSaved);
    if (typeof parsed !== 'object' || !parsed) {
      return INITIAL_USER;
    }

    // Retain registered identity if user signed in before
    const isRegistered = !parsed.isGuest && Boolean(parsed.name && parsed.name !== 'Guest User');

    return {
      ...INITIAL_USER,
      ...parsed,
      id: parsed.id || `usr_${Date.now()}`,
      name: parsed.name ? parsed.name.trim() : (isRegistered ? 'User' : 'Guest User'),
      email: parsed.email ? parsed.email.trim() : '',
      isGuest: !isRegistered,
      isPro: Boolean(parsed.isPro),
      memberSince: parsed.memberSince || parsed.createdAt || Date.now(),
    };
  } catch (err) {
    console.warn('Failed to hydrate user profile, falling back to initial state:', err);
    return INITIAL_USER;
  }
}

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(hydrateInitialUser);

  // Sync to local storage on every change
  useEffect(() => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      // Also write to legacy key for backwards compatibility
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(user));
    } catch (err) {
      console.error('Failed to persist user profile to localStorage:', err);
    }
  }, [user]);

  const updateUser = (updatedFields: Partial<UserProfile>) => {
    setUser((prev) => {
      const merged: UserProfile = {
        ...prev,
        ...updatedFields,
        // Ensure name is never blanked out if previously set
        name: updatedFields.name !== undefined ? (updatedFields.name.trim() || prev.name) : prev.name,
      };
      return merged;
    });
  };

  const signIn = (authenticatedUser: UserProfile) => {
    const freshProfile: UserProfile = {
      ...user,
      ...authenticatedUser,
      id: authenticatedUser.id || user.id || `usr_${Date.now()}`,
      name: authenticatedUser.name?.trim() || user.name || 'User',
      email: authenticatedUser.email?.trim() || user.email || '',
      isGuest: false,
      memberSince: user.memberSince || Date.now(),
    };
    setUser(freshProfile);
  };

  const signOut = () => {
    const guestUser: UserProfile = {
      ...INITIAL_USER,
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      email: '',
      isGuest: true,
      isPro: false,
      memberSince: Date.now(),
    };
    setUser(guestUser);
  };

  const upgradeToPro = (plan: 'lifetime' | 'monthly' | 'annual' = 'lifetime') => {
    setUser((prev) => ({
      ...prev,
      isPro: true,
      proPlan: plan,
      proUnlockDate: Date.now(),
    }));
  };

  const isAuthenticated = !user.isGuest && Boolean(user.email || (user.name && user.name !== 'Guest User'));

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated,
        updateUser,
        signIn,
        signOut,
        upgradeToPro,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
