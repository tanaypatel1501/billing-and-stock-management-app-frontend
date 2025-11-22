import { AuthService } from './services/auth-service/auth.service';

/**
 * Factory function for APP_INITIALIZER.
 * It calls the initializeAuth method on the AuthService and returns the Promise.
 */
export function initializeApp(authService: AuthService) {
  return () => authService.initializeAuth();
}