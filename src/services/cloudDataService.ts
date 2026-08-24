import { getAuth, deleteUser } from 'firebase/auth';
import { getFirestore, doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Irreversibly wipes all hosted group sessions and deletes the Firebase Auth account.
 */
export const wipeUserCloudData = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    // Check if auth instance is available
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const db = getFirestore();

      // 1. Find and delete all bill sessions where current user is host
      const sessionsRef = collection(db, 'group_sessions');
      const q = query(sessionsRef, where('hostId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map((document) => 
        deleteDoc(doc(db, 'group_sessions', document.id))
      );
      await Promise.all(deletePromises);

      // 2. Irreversibly delete account from Firebase Auth
      await deleteUser(user);
      
      return { success: true };
    }
  } catch (error) {
    console.warn("Cloud data wipe bypassed or encountered error:", error);
    // Return gracefully if Firebase isn't initialized or running in local guest mode
    return { success: false, message: error instanceof Error ? error.message : "Error wiping cloud data" };
  }

  return { success: false, message: "No active user session found." };
};
