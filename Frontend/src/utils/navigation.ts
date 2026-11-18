import { router, type Href } from 'expo-router';

/**
 * Go back if there is a screen to go back to; otherwise replace the current screen with `fallback`.
 * Calling router.back() with no history (deep link, web refresh, or right after a role switch)
 * raises "The action 'GO_BACK' was not handled by any navigator".
 */
export function goBack(fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
