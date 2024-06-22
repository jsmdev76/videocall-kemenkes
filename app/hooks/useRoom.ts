import { useSearchParams } from '@remix-run/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useIsomorphicLayoutEffect } from 'react-use'
import type { MessageFromServer, RoomState } from '~/types/Messages'
import assertNever from '~/utils/assertNever'
import useSignal from './useSignal'
import type { UserMedia } from './useUserMedia'
import { getRole } from '~/utils/getRole'

export default function useRoom({
	roomName,
	userMedia,
}: {
	roomName: string
	userMedia: UserMedia
}) {
	const { signal } = useSignal(roomName)
	const [roomState, setRoomState] = useState<RoomState>({ users: [] })
	const [userId, setUserId] = useState<string>()
	const [searchParams] = useSearchParams()
	const listener = searchParams.get('listener')
	const whisper = searchParams.get('whisper')

	// using the latest ref pattern here so we don't need to keep rebinding
	// the message handler every time a dependency changes
	// https://epicreact.dev/the-latest-ref-pattern-in-react/
	const messageHandler = (e: MessageEvent<MessageFromServer>) => {
		const { message } = e.data
		switch (message.type) {
			case 'roomState':
				// prevent updating state if nothing has changed
				if (JSON.stringify(message.state) === JSON.stringify(roomState)) break
				setRoomState(message.state)
				break
			case 'error':
				console.error('Received error message from WebSocket')
				console.error(message.error)
				break
			case 'identity':
				setUserId(message.id)
				break
			case 'directMessage':
				// TODO: handle DM's
				break
			case 'muteMic':
				userMedia.turnMicOff()
				break
			default:
				assertNever(message)
				break
		}
	}

	const messageHandlerRef = useRef(messageHandler)
	useIsomorphicLayoutEffect(() => {
		messageHandlerRef.current = messageHandler
	})

	useEffect(() => {
		const messageHandler = (e: MessageEvent<MessageFromServer>) => {
			messageHandlerRef.current(e)
		}

		signal.addEventListener('message', messageHandler)

		return () => {
			signal.removeEventListener('message', messageHandler)
		}
	}, [roomName, signal])

	// const identity = useMemo(
	// 	() => roomState.users.find((u) => u.id === userId),
	// 	[roomState.users, userId]
	// )

	// const otherUsers = useMemo(
	// 	() => roomState.users.filter((u) => u.id !== userId && u.joined),
	// 	[userId, roomState.users]
	// )

	const identity = useMemo(() => {
		if (listener) {
			return {
				id: crypto.randomUUID(),
				name: 'Listener',
				role: 'listener',
				raisedHand: false,
				speaking: false,
				joined: true,
				tracks: {},
			}
		}
		const user = roomState.users.find((u) => u.id === userId)
		if (user) {
			return {...user, role: getRole(user.name)}
		}
	}, [roomState.users, userId, listener])

	const otherUsers = useMemo(() => {
		const users = roomState.users.filter((u) => u.id !== userId && u.joined)
		if (identity?.role === 'listener') {
			return users.filter(u => u.role !== 'listener').map(user => ({
				...user,
				role: getRole(user.name)
			}))
		}
		if (listener) {
			users.push({
				id: 'listener',
				name: 'Listener',
				role: 'listener',
				raisedHand: false,
				speaking: false,
				joined: true,
				tracks: {},
			})
		}
		return users.map(user => ({
			...user,
			role: getRole(user.name)
		}))
	}, [userId, roomState.users, listener])

	return { identity, otherUsers, signal, roomState }
}
