import debounce from "lodash.debounce"
import LRUCache from "lru-cache"
import React from "react"
import { FederationServer, ServerApi } from "stellar-sdk"
import { useSingleton } from "../hooks/util"
import { FetchState } from "../lib/async"

// Just to make the cache types more readable
type CacheKey = string
type Domain = string
type JWT = string
type PublicKey = string
type StellarAddress = string

interface CacheContextType<K, V> {
  cache: LRUCache<K, V>
  delete(key: K): void
  store(key: K, value: V, maxAge?: number): void
}

export type SigningKeyContextType = CacheContextType<PublicKey, Domain>
export type StellarAddressContextType = CacheContextType<StellarAddress, FederationServer.Record>
export type StellarAddressReverseContextType = CacheContextType<PublicKey, StellarAddress>
export type StellarIssuerAccountDataContextType = CacheContextType<PublicKey, FetchState<ServerApi.AccountRecord>>
export type StellarTomlContextType = CacheContextType<Domain, FetchState<any>>
export type WebAuthTokenContextType = CacheContextType<CacheKey, JWT>

function useCachingContext<K, V>(cache: LRUCache<K, V>): CacheContextType<K, V> {
  // Little hack to force propagating updates
  const [counter, setUpdateCounter] = React.useState(0)
  const forceRerender = debounce(() => setUpdateCounter(ctr => ctr + 1), 50)

  const contextValue = React.useMemo<CacheContextType<K, V>>(
    () => ({
      cache,
      delete(key) {
        cache.del(key)
        forceRerender()
      },
      store(key, value, maxAge?: number) {
        cache.set(key, value, maxAge)
        forceRerender()
      }
    }),
    [cache, counter]
  )
  return contextValue
}

const emptyContextValue: CacheContextType<any, any> = {
  cache: new LRUCache(),
  delete: () => undefined,
  store: () => undefined
}

export const SigningKeyCacheContext = React.createContext<SigningKeyContextType>(emptyContextValue)
export const StellarAddressCacheContext = React.createContext<StellarAddressContextType>(emptyContextValue)
export const StellarAddressReverseCacheContext = React.createContext<StellarAddressReverseContextType>(
  emptyContextValue
)
export const StellarIssuerAccountCacheContext = React.createContext<StellarIssuerAccountDataContextType>(
  emptyContextValue
)
export const StellarTomlCacheContext = React.createContext<StellarTomlContextType>(emptyContextValue)
export const WebAuthTokenCacheContext = React.createContext<WebAuthTokenContextType>(emptyContextValue)

interface Props {
  children: React.ReactNode
}

export function SigningKeyCachingProvider(props: Props) {
  const cache = useSingleton(
    () =>
      new LRUCache<PublicKey, Domain>({
        max: 100
      })
  )
  const contextValue = useCachingContext(cache)
  return <SigningKeyCacheContext.Provider value={contextValue}>{props.children}</SigningKeyCacheContext.Provider>
}

export function StellarAddressesCachingProvider(props: Props) {
  const cache = useSingleton(
    () =>
      new LRUCache<StellarAddress, FederationServer.Record>({
        max: 1000,
        maxAge: 10 * 60 * 1000 // 10 mins
      })
  )
  const contextValue = useCachingContext(cache)
  return (
    <StellarAddressCacheContext.Provider value={contextValue}>{props.children}</StellarAddressCacheContext.Provider>
  )
}

export function StellarAddressesReverseCachingProvider(props: Props) {
  const cache = useSingleton(
    () =>
      new LRUCache<PublicKey, StellarAddress>({
        max: 1000,
        maxAge: 60 * 60 * 1000 // 60 mins (long TTL, since reverse lookup is purely informational)
      })
  )
  const contextValue = useCachingContext(cache)
  return (
    <StellarAddressReverseCacheContext.Provider value={contextValue}>
      {props.children}
    </StellarAddressReverseCacheContext.Provider>
  )
}

export function StellarIssuerAccountCachingProvider(props: Props) {
  const cache = useSingleton(
    () =>
      new LRUCache<PublicKey, FetchState<ServerApi.AccountRecord>>({
        max: 1000,
        maxAge: 10 * 60 * 1000 // 10 mins (issuer account data is assumed to be almost immutable)
      })
  )
  const contextValue = useCachingContext(cache)
  return (
    <StellarIssuerAccountCacheContext.Provider value={contextValue}>
      {props.children}
    </StellarIssuerAccountCacheContext.Provider>
  )
}

export function StellarTomlCachingProvider(props: Props) {
  const cache = useSingleton(
    () =>
      new LRUCache<Domain, any>({
        max: 100
      })
  )
  const contextValue = useCachingContext(cache)
  return <StellarTomlCacheContext.Provider value={contextValue}>{props.children}</StellarTomlCacheContext.Provider>
}

export function WebAuthCachingProvider(props: Props) {
  const cache = useSingleton(
    () =>
      new LRUCache<CacheKey, JWT>({
        max: 100
      })
  )
  const contextValue = useCachingContext(cache)
  return <WebAuthTokenCacheContext.Provider value={contextValue}>{props.children}</WebAuthTokenCacheContext.Provider>
}

export function CachingProviders(props: Props) {
  return (
    <SigningKeyCachingProvider>
      <StellarAddressesCachingProvider>
        <StellarAddressesReverseCachingProvider>
          <StellarIssuerAccountCachingProvider>
            <StellarTomlCachingProvider>
              <WebAuthCachingProvider>{props.children}</WebAuthCachingProvider>
            </StellarTomlCachingProvider>
          </StellarIssuerAccountCachingProvider>
        </StellarAddressesReverseCachingProvider>
      </StellarAddressesCachingProvider>
    </SigningKeyCachingProvider>
  )
}
