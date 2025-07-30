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
  register: (socket: WebSocket) => void
  receive: (value: TSchema) => void
}

type ServerStates<T extends StateDefinitions> = {
  [K in keyof T]: T[K] extends StateDefinition<infer U> ? ServerState<U> : never
}

export type CreateClientSideStateTypes<T> = {
  [K in keyof T]: T[K] extends ServerState<infer U> ? { type: U } : never
}

function createState<TSchema>(
  name: string,
  initialValue: StateDefinition<TSchema>['initialValue'],
) {
  let _value = initialValue
  console.log('_value', _value, 'initialValue', initialValue)
  let _socket: WebSocket | undefined = undefined

  function sendPacket<TSchema>(packet: Packet<TSchema>) {
    const stringified = JSON.stringify(packet)
    console.log('Sending:', stringified)
    _socket?.send(stringified)
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

export function createStates<T extends StateDefinitions>(
  stateDefinitions: T,
): ServerStates<T> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const states = {} as ServerStates<T>
  for (const [key, definition] of Object.entries(stateDefinitions)) {
    ;(states as any)[key] = createState(key, definition.initialValue)
  }
  return states
}

export function registerStates<T extends StateDefinitions>(
  states: ServerStates<T>,
  socket: WebSocket,
) {
  console.log('register states')
  for (const [key] of Object.entries(states)) {
    states[key].register(socket)
  }
}

export function listen<T extends StateDefinitions>(
  states: ServerStates<T>,
  event: MessageEvent,
) {
  console.log('listen')
  const data = JSON.parse(event.data as string)
  console.log('lsiten, data received:', data)
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
