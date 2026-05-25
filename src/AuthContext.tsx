import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from './types';

interface AuthContextType {
    user: FirebaseUser | null;
    profile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                try {
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
                    } else {
                        // User exists in auth but no profile in firestore yet. 
                        // If it's the admin, they might not have a document yet, but our rules allow them based on email.
                        if (firebaseUser.email === 'mrxalexandre@gmail.com') {
                             setProfile({
                                id: firebaseUser.uid,
                                email: firebaseUser.email,
                                name: 'Developer Admin',
                                role: 'admin',
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                             });
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user profile", error);
                    // handleFirestoreError involves throwing, inside useEffect it's just gonna log as unhandled promise rejection.
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
