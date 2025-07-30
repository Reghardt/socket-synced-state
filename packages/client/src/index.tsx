import { atom, createStore, Provider, useAtom } from 'jotai'
import { createContext, useContext } from 'react'
import type { Packet } from 'sss-server'

const myStore = createStore()

const _stateMap = new Map<string, ReturnType<typeof atom<unknown>>>()

function send<T>(websocket: WebSocket, data: Packet<T>) {
  if (websocket.readyState === WebSocket.OPEN) {
    console.log('new value', data)
    websocket.send(JSON.stringify(data))
  }
}

export function useSocketSyncedState(
  websocket: WebSocket,
  eventName: string,
  stateMap: typeof _stateMap,
) {
  if (stateMap.has(eventName) === false) {
    const state = atom(undefined, (get, set, newValue) => {
      set(state, newValue)
    })
    stateMap.set(eventName, state)
  }

  const state = stateMap.get(eventName)!

  const [val, setVal] = useAtom(state)
  return [
    val,
    (val: any) => {
      send(websocket, {
        name: eventName,
        request: 'set',
        value: val,
      })
      setVal(val)
    },
  ]
}

//[unknown, SetAtom<[unknown], void>]

type TransformedStatesToHookFunctions<
  OriginalValueTypesMap extends Record<string, any>,
> = {
  [K in keyof OriginalValueTypesMap]: () => [
    OriginalValueTypesMap[K]['type'] | undefined,

    updater: (prev: OriginalValueTypesMap[K]['type']) => void,
  ]
}

export function createClientStateProxy<T extends Record<string, any>>(
  websocket: WebSocket,
) {
  return new Proxy({} as TransformedStatesToHookFunctions<T>, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return () => useSocketSyncedState(websocket, prop, _stateMap)
      }
      return undefined
    },
  })
}

export function createSSSContext<T extends Record<string, any>>(wsUri: string) {
  type SSSContext = {
    websocket: WebSocket
    state: ReturnType<typeof createClientStateProxy<T>>
  }

  // const wsUri = 'ws://localhost:8000'
  const websocket = new WebSocket(wsUri)

  websocket.addEventListener('open', (e) => {
    console.log('Connection successful!', e)
    _stateMap.forEach((state, key) => {
      console.log('STATE', key)
      send(websocket, {
        name: key,
        request: 'get',
        value: undefined,
      })
    })
  })

  websocket.addEventListener('message', (e) => {
    const data = JSON.parse(e.data)
    console.log(data)
    const atm = _stateMap.get(data.name)
    if (atm) {
      myStore.set(atm, data.value)
      // const value = myStore.get(atm);
      // console.log("val", value);
    }
  })

  const SocketContext = createContext<SSSContext | null>(null)

  const useSSS = () => {
    const context = useContext(SocketContext)
    if (!context) throw new Error('useSSS must be used within an SSSProvider')
    return {
      state: context.state,
    }
  }

  const SSSProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    return (
      <Provider store={myStore}>
        <SocketContext.Provider
          value={{
            websocket,
            state: createClientStateProxy<T>(websocket),
          }}
        >
          {children}
        </SocketContext.Provider>
      </Provider>
    )
  }

  return { SSSProvider, useSSS }
}
