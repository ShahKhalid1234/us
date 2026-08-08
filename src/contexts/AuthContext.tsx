import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, reload } from 'firebase/auth';
import { auth, db, doc, onSnapshot, getDoc, setDoc } from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  loginAsMockUser: (email: string, displayName: string, role: 'romeo' | 'juliet') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for mock user session first
    const mockUserJson = localStorage.getItem('mock_user');
    const mockProfileJson = localStorage.getItem('mock_profile');
    if (mockUserJson && mockProfileJson) {
      setUser(JSON.parse(mockUserJson));
      setUserProfile(JSON.parse(mockProfileJson));
      setLoading(false);
      
      const syncProfile = () => {
        const updatedProfile = localStorage.getItem('mock_profile');
        if (updatedProfile) {
          setUserProfile(JSON.parse(updatedProfile));
        }
      };
      window.addEventListener('storage', syncProfile);
      return () => {
        window.removeEventListener('storage', syncProfile);
      };
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        // Subscribe to user profile changes
        const profileRef = doc(db, 'users', currentUser.uid);
        
        unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const loginAsMockUser = async (email: string, displayName: string, role: 'romeo' | 'juliet') => {
    setLoading(true);
    const uid = `demo_${role}`;
    
    const dummyUser = {
      uid,
      email,
      displayName,
      emailVerified: true,
      photoURL: '',
      metadata: {},
      providerData: [],
      delete: async () => {},
      getIdToken: async () => 'mock_token',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      providerId: 'password',
      refreshToken: 'mock_refresh_token',
      tenantId: null,
    } as unknown as User;

    const mockProfile: UserProfile = {
      uid,
      username: role,
      displayName: displayName,
      bio: `Local demo account for ${displayName} ✨`,
      profilePhoto: "",
      onlineStatus: "online" as const,
      lastSeen: Date.now(),
      joinedDate: Date.now(),
      friendCount: 1
    };

    localStorage.setItem('mock_user', JSON.stringify(dummyUser));
    localStorage.setItem('mock_profile', JSON.stringify(mockProfile));
    localStorage.setItem('bypass_verification', 'true');
    localStorage.setItem('demo_user_active', 'true');
    
    // Also save Romeo/Juliet to the mock DB so they exist for queries
    const usersCollectionKey = 'mock_db_users';
    const existingUsers = localStorage.getItem(usersCollectionKey);
    const usersObj = existingUsers ? JSON.parse(existingUsers) : {};
    usersObj[uid] = mockProfile;
    
    // Make sure both Romeo and Juliet exist in the mock DB so they can find each other
    const otherRole = role === 'romeo' ? 'juliet' : 'romeo';
    const otherUid = `demo_${otherRole}`;
    if (!usersObj[otherUid]) {
      usersObj[otherUid] = {
        uid: otherUid,
        username: otherRole,
        displayName: otherRole.charAt(0).toUpperCase() + otherRole.slice(1),
        bio: `Local demo account for ${otherRole.charAt(0).toUpperCase() + otherRole.slice(1)} ✨`,
        profilePhoto: "",
        onlineStatus: "online" as const,
        lastSeen: Date.now(),
        joinedDate: Date.now(),
        friendCount: 1
      };
    }
    
    localStorage.setItem(usersCollectionKey, JSON.stringify(usersObj));

    // Initialize default Friendship and LoveSpace for them
    const friendshipId = [uid, otherUid].sort().join('_');
    const friendshipsCollectionKey = 'mock_db_friendships';
    const friendshipsObj = localStorage.getItem(friendshipsCollectionKey) ? JSON.parse(localStorage.getItem(friendshipsCollectionKey)!) : {};
    friendshipsObj[friendshipId] = {
      id: friendshipId,
      user1Id: uid,
      user2Id: otherUid,
      timestamp: Date.now()
    };
    localStorage.setItem(friendshipsCollectionKey, JSON.stringify(friendshipsObj));

    const loveSpacesCollectionKey = 'mock_db_loveSpaces';
    const loveSpacesObj = localStorage.getItem(loveSpacesCollectionKey) ? JSON.parse(localStorage.getItem(loveSpacesCollectionKey)!) : {};
    if (!loveSpacesObj[friendshipId]) {
      loveSpacesObj[friendshipId] = {
        id: friendshipId,
        participants: [uid, otherUid],
        theme: 'moonlit_garden',
        createdAt: Date.now()
      };
      localStorage.setItem(loveSpacesCollectionKey, JSON.stringify(loveSpacesObj));
    }

    setUser(dummyUser);
    setUserProfile(mockProfile);
    setLoading(false);
  };

  const logout = async () => {
    try {
      localStorage.removeItem('mock_user');
      localStorage.removeItem('mock_profile');
      localStorage.removeItem('bypass_verification');
      localStorage.removeItem('demo_user_active');

      if (user && !user.uid.startsWith('demo_') && !user.uid.startsWith('mock_')) {
        // Update user status to offline before signing out
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            await setDoc(userRef, { onlineStatus: 'offline', lastSeen: Date.now() }, { merge: true });
          }
        } catch (err) {
          console.error("Error updating offline status during logout:", err);
        }
        await signOut(auth);
      }
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const refreshAuth = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setUser({ ...auth.currentUser });
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, refreshAuth, loginAsMockUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
