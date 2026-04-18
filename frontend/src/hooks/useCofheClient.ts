import { useCallback, useEffect, useRef, useState } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { createCofheClient, createCofheConfig } from '@cofhe/sdk/web'
import { arbSepolia } from '@cofhe/sdk/chains'
import type { CofheClient } from '@cofhe/sdk'

let sharedClient: CofheClient | null = null
function getSharedClient(): CofheClient {
  if (!sharedClient) {
    sharedClient = createCofheClient(
      createCofheConfig({ supportedChains: [arbSepolia] })
    )
  }
  return sharedClient
}

type ConnectState =
  | { status: 'idle' }
  | { status: 'waiting-wallet' }
  | { status: 'connecting' }
  | { status: 'ready' }
  | { status: 'error'; message: string }

// Returns the CofheClient plus a connection state. The client is connected
// to the active wallet + Arbitrum Sepolia; any failure surfaces in `state`
// so the UI can show it instead of a permanent spinner.
export function useCofheClient() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [state, setState] = useState<ConnectState>({ status: 'idle' })
  const attemptRef = useRef(0)

  const connect = useCallback(async () => {
    if (!publicClient || !walletClient) {
      setState({ status: 'waiting-wallet' })
      return
    }
    const attempt = ++attemptRef.current
    setState({ status: 'connecting' })
    try {
      await getSharedClient().connect(publicClient, walletClient)
      if (attempt === attemptRef.current) setState({ status: 'ready' })
    } catch (err) {
      console.error('[cofhe] connect failed', err)
      const message = err instanceof Error ? err.message : String(err)
      if (attempt === attemptRef.current) setState({ status: 'error', message })
    }
  }, [publicClient, walletClient])

  useEffect(() => {
    void connect()
  }, [connect])

  return {
    client: getSharedClient(),
    ready: state.status === 'ready',
    state,
    retry: connect,
  }
}
