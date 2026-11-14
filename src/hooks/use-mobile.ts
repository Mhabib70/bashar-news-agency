import * as React from "react"

const MOBILE_BREAKPOINT = 768

// تشخیص نمایش موبایل از طریق subscribe به matchMedia.
// از useSyncExternalStore استفاده شده تا هم SSR--safe باشد و هم
// نیازی به setState همگام داخل useEffect نباشد (قانون react-hooks/set-state-in-effect).
export function useIsMobile() {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", onStoreChange)
    return () => mql.removeEventListener("change", onStoreChange)
  }, [])

  const getSnapshot = React.useCallback(() => window.innerWidth < MOBILE_BREAKPOINT, [])
  const getServerSnapshot = React.useCallback(() => false, [])

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
