import {
  AuthenticationDetails,
  CognitoUser,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';
import { userPool } from '../config/cognito';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  cognitoUser: CognitoUser | null;
  userAttributes: Record<string, string>;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  completeNewPasswordChallenge: (
    newPassword: string,
    attributes?: { givenName?: string; familyName?: string },
  ) => Promise<void>;
  clearError: () => void;
}

type LoginResult =
  | { status: 'success'; session: CognitoUserSession }
  | { status: 'newPasswordRequired'; userAttributes: Record<string, string> };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);
  const [userAttributes, setUserAttributes] = useState<Record<string, string>>({});

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);
    setError(null);

    const user = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    return new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          setIsAuthenticated(true);
          setCognitoUser(user);
          setIsLoading(false);
          resolve({ status: 'success', session });
        },
        onFailure: (err) => {
          setIsLoading(false);
          const message = err.message || 'Authentication failed';
          setError(message);
          reject(new Error(message));
        },
        newPasswordRequired: (attrs) => {
          setCognitoUser(user);
          setUserAttributes(attrs);
          setIsLoading(false);
          resolve({ status: 'newPasswordRequired', userAttributes: attrs });
        },
      });
    });
  }, []);

  const completeNewPasswordChallenge = useCallback(
    async (
      newPassword: string,
      attributes?: { givenName?: string; familyName?: string },
    ): Promise<void> => {
      if (!cognitoUser) {
        throw new Error('No user session found');
      }

      setIsLoading(true);
      setError(null);

      const requiredAttributes: Record<string, string> = {};
      if (attributes?.givenName) {
        requiredAttributes.given_name = attributes.givenName;
      }
      if (attributes?.familyName) {
        requiredAttributes.family_name = attributes.familyName;
      }

      return new Promise((resolve, reject) => {
        cognitoUser.completeNewPasswordChallenge(newPassword, requiredAttributes, {
          onSuccess: () => {
            setIsAuthenticated(true);
            setIsLoading(false);
            resolve();
          },
          onFailure: (err) => {
            setIsLoading(false);
            const message = err.message || 'Password change failed';
            setError(message);
            reject(new Error(message));
          },
        });
      });
    },
    [cognitoUser],
  );

  const logout = useCallback(() => {
    const user = userPool.getCurrentUser();
    if (user) {
      user.signOut();
    }
    setIsAuthenticated(false);
    setCognitoUser(null);
    setUserAttributes({});
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        error,
        cognitoUser,
        userAttributes,
        login,
        logout,
        completeNewPasswordChallenge,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
