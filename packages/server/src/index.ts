import type { z } from 'zod'

export type Packet<TSchema> = {
  name: string
  request: 'get' | 'set'
  value: TSchema | undefined
}

type StateDefinition<TSchema> = {
  schema: z.ZodType<TSchema>
  initialValue: TSchema
}

type StateDefinitions = {
  [key: string]: StateDefinition<any> // any does not destroy type information in this context,  "this container can hold StateDefinitions of any schema type"
}

type ServerState<TSchema> = {
  get: () => TSchema
  set: (value: TSchema) => void
  register: (clients: Set<WebSocket>) => void
  receive: (value: TSchema) => void
}

type ServerStates<T extends StateDefinitions> = {
  [K in keyof T]: T[K] extends StateDefinition<infer U> ? ServerState<U> : never
}

export type CreateClientSideStateTypes<T> = {
  [K in keyof T]: T[K] extends ServerState<infer U> ? { type: U } : never
}

function createGlobalState<TSchema>(
  name: string,
  initialValue: StateDefinition<TSchema>['initialValue'],
) {
  let _value = initialValue
  console.log('_value', _value, 'initialValue', initialValue)
  // let _socket: WebSocket | undefined = undefined;

  let _clients: Set<WebSocket> | undefined = undefined

  function sendPacket<TSchema>(packet: Packet<TSchema>) {
    const stringified = JSON.stringify(packet)
    console.log('Sending:', stringified)
    // _socket?.send(stringified);
    _clients?.forEach((client) => {
      client.send(stringified)
    })
  }

  function reply() {
    console.log('REPLY')
    sendPacket({
      name,
      request: 'set',
      value: _value,
    })
  }

  const getValue = () => _value

  const setValue = (newValue: TSchema) => {
    //@ts-ignore
    _value = newValue
    console.log('newValue', newValue, '_value', _value)
    sendPacket({
      name,
      request: 'set',
      value: _value,
    })
  }

  function register(clients: Set<WebSocket>) {
    _clients = clients
  }

  function receive(value: TSchema) {
    console.log('Received', value)
    setValue(value)
  }

  return {
    get: getValue,
    set: setValue,
    register,
    receive,
    reply,
  }
}

function createClientState<TSchema>(
  name: string,
  initialValue: StateDefinition<TSchema>['initialValue'],
) {
  let _value = initialValue
  // console.log("_value", _value, "initialValue", initialValue);
  let _socket: WebSocket | undefined = undefined

  // let _clients: Set<WebSocket> | undefined = undefined;

  function sendPacket<TSchema>(packet: Packet<TSchema>) {
    const stringified = JSON.stringify(packet)
    console.log('Sending:', stringified)
    _socket?.send(stringified)
    // _clients?.forEach((client) => {
    //   client.send(stringified);
    // });
  }

  function reply() {
    console.log('REPLY')
    sendPacket({
      name,
      request: 'set',
      value: _value,
    })
  }

  const getValue = () => _value

  const setValue = (newValue: TSchema) => {
    //@ts-ignore
    _value = newValue
    console.log('newValue', newValue, '_value', _value)
    sendPacket({
      name,
      request: 'set',
      value: _value,
    })
  }

  function register(socket: WebSocket) {
    _socket = socket
  }

  function receive(value: TSchema) {
    console.log('Received', value)
    setValue(value)
  }

  return {
    get: getValue,
    set: setValue,
    register,
    receive,
    reply,
  }
}

export function defineState<TSchema>(
  schema: StateDefinition<TSchema>['schema'],
  initialValue: StateDefinition<TSchema>['initialValue'],
): StateDefinition<TSchema> {
  return {
    schema,
    initialValue,
  }
}

export function createGlobalStates<T extends StateDefinitions>(
  globalStateDefinitions: T,
): ServerStates<T> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const states = {} as ServerStates<T>
  for (const [key, definition] of Object.entries(globalStateDefinitions)) {
    ;(states as any)[key] = createGlobalState(key, definition.initialValue)
  }
  return states
}

export function createClientStates<T extends StateDefinitions>(
  clientStateDefinitions: T,
) {
  return clientStateDefinitions
}

export function registerClientStates<T extends StateDefinitions>(
  stateDefinitions: StateDefinitions,
  socket: WebSocket,
): ServerStates<T> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const states = {} as ServerStates<T>
  for (const [key, definition] of Object.entries(stateDefinitions)) {
    const clientState = createClientState(key, definition.initialValue)
    clientState.register(socket)
    ;(states as any)[key] = clientState
  }
  return states
}

export function registerGlobalStates<T extends StateDefinitions>(
  states: ServerStates<T>,
  clients: Set<WebSocket>,
) {
  console.log('register states')
  for (const [key] of Object.entries(states)) {
    states[key].register(clients)
  }
}

export function listen<T extends StateDefinitions>(
  states: ServerStates<T>,
  // @ts-ignore
  event: MessageEvent<any>,
) {
  console.log('listen')
  const data = JSON.parse(event.data)
  console.log('listen, data received:', data)
  for (const [key] of Object.entries(states)) {
    console.log(key, data.name)
    if (key === data.name) {
      console.log('test')
      if (data.request === 'set') {
        states[key].receive(data.value)
      } else {
        // @ts-ignore
        states[key].reply()
      }
    }
  }
}

export function createNodeSocketAdapter(socket: any) {
  const socketAdapter: WebSocket = {
    addEventListener: (event: any, handler: any) => socket.on(event, handler),
    removeEventListener: (event: any, handler: any) =>
      socket.off(event, handler),
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    dispatchEvent: () => true,
    get readyState() {
      return socket.readyState
    },
    get url() {
      return ''
    },
    get protocol() {
      return ''
    },
    get extensions() {
      return ''
    },
    get binaryType() {
      return 'arraybuffer' as const
    },
    set binaryType(value) {
      /* ignore */
    },
    get bufferedAmount() {
      return 0
    },
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    CONNECTING: 0 as const,
    OPEN: 1 as const,
    CLOSING: 2 as const,
    CLOSED: 3 as const,
  }

  return socketAdapter
}

export function createNodeDataAdapter(data: any) {
  // @ts-ignore
  const messageEventAdapter: MessageEvent = {
    data: data.toString(),
  }

  return messageEventAdapter
}
